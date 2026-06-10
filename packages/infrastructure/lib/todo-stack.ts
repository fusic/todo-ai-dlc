import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as sns from "aws-cdk-lib/aws-sns";
import type { Construct } from "constructs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class TodoStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		// --- DynamoDB Table ---
		const todoTable = new dynamodb.Table(this, "TodoTable", {
			tableName: "TodoTable",
			partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			// CH-1（RF-17）: deprecated `pointInTimeRecovery` から移行（PITR 有効は不変 — IT-9）
			pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});

		// CH-5（QT-4 / D-2）: オリジン検証ヘッダの本番値 — Secrets Manager 自動生成。
		// CloudFormation 動的参照で CloudFront / Lambda へ注入され、リポジトリ・synth テンプレートに
		// 平文は 0 件（IT-3/IT-4/IT-5）。excludePunctuation で HTTP ヘッダ値として安全な文字集合に限定。
		const originVerifySecret = new secretsmanager.Secret(this, "OriginVerifySecret", {
			description: "CloudFront → API Gateway origin verification header value (x-origin-verify)",
			generateSecretString: {
				passwordLength: 32,
				excludePunctuation: true,
			},
		});

		// CH-2（RF-17 / AR-O7）: deprecated `logRetention` の後継 — 明示 LogGroup（CDK 一意名 / 90 日 / DESTROY）。
		// Custom::LogRetention カスタムリソースが消える（IT-8）。旧 /aws/lambda/<関数名> は残置許容（Q2=a）。
		const functionLogGroup = new logs.LogGroup(this, "TodoApiFunctionLogGroup", {
			retention: logs.RetentionDays.THREE_MONTHS, // SECURITY-14: 保持 90 日維持（C-1）
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});

		// --- Lambda Function ---
		const todoFunction = new NodejsFunction(this, "TodoApiFunction", {
			entry: path.join(__dirname, "../../backend/src/index.ts"),
			handler: "handler",
			runtime: lambda.Runtime.NODEJS_20_X,
			memorySize: 256,
			timeout: cdk.Duration.seconds(30),
			environment: {
				TABLE_NAME: todoTable.tableName,
				NODE_OPTIONS: "--enable-source-maps",
				// CH-7（QT-4）: 検証ミドルウェア（BR-013）の期待値 — デプロイ時の動的参照解決のため
				// 実行ロールに secretsmanager の実行時権限は不要（最小権限維持）
				ORIGIN_VERIFY_SECRET: originVerifySecret.secretValue.unsafeUnwrap(),
			},
			bundling: {
				format: OutputFormat.ESM,
				minify: true,
				sourceMap: true,
				target: "node20",
				externalModules: ["@aws-sdk/*"],
			},
			logGroup: functionLogGroup, // CH-2
		});

		// CH-3（SECURITY-06 / QT-5 / RF-14）: Least privilege — DynamoDB は 5 アクションのみ（IT-1。AR-O3 解消）
		todoTable.grant(
			todoFunction,
			"dynamodb:GetItem",
			"dynamodb:PutItem",
			"dynamodb:UpdateItem",
			"dynamodb:DeleteItem",
			"dynamodb:Scan",
		);

		// --- API Gateway (HTTP API) ---
		const lambdaIntegration = new HttpLambdaIntegration("TodoLambdaIntegration", todoFunction);

		// CH-4（RF-12 / functional Q2=a）: corsPreflight は定義しない（CORS 0 箇所 — IT-2）。
		// 既知クライアントは同梱 SPA のみで、本番 = CloudFront / ローカル = Vite proxy の同一オリジン `/api`。
		const httpApi = new apigatewayv2.HttpApi(this, "TodoHttpApi", {
			apiName: "TodoApi",
		});

		httpApi.addRoutes({
			path: "/{proxy+}",
			methods: [apigatewayv2.HttpMethod.ANY],
			integration: lambdaIntegration,
		});

		// SECURITY-02: API Gateway access logging
		const apiLogGroup = new logs.LogGroup(this, "ApiAccessLog", {
			retention: logs.RetentionDays.THREE_MONTHS,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});

		const defaultStage = httpApi.defaultStage?.node.defaultChild as apigatewayv2.CfnStage;
		if (defaultStage) {
			defaultStage.accessLogSettings = {
				destinationArn: apiLogGroup.logGroupArn,
				format: JSON.stringify({
					requestId: "$context.requestId",
					ip: "$context.identity.sourceIp",
					method: "$context.httpMethod",
					path: "$context.path",
					status: "$context.status",
					responseLength: "$context.responseLength",
				}),
			};
		}

		// --- S3 Bucket (Frontend Static Hosting) ---
		const siteBucket = new s3.Bucket(this, "FrontendBucket", {
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // SECURITY-07, SECURITY-09
			encryption: s3.BucketEncryption.S3_MANAGED, // SECURITY-01
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
		});

		// --- CloudFront Distribution ---

		// SECURITY-04: Security response headers
		const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, "SecurityHeaders", {
			securityHeadersBehavior: {
				contentSecurityPolicy: {
					contentSecurityPolicy:
						"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
					override: true,
				},
				strictTransportSecurity: {
					accessControlMaxAge: cdk.Duration.days(365),
					includeSubdomains: true,
					override: true,
				},
				contentTypeOptions: { override: true },
				frameOptions: {
					frameOption: cloudfront.HeadersFrameOption.DENY,
					override: true,
				},
				referrerPolicy: {
					referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
					override: true,
				},
			},
		});

		// S3 origin with OAC
		const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(siteBucket);

		// API Gateway origin
		// CH-6（QT-4 / D-2）: 意図経路の証明 — CloudFront が `/api/*` オリジンへ x-origin-verify を付与し、
		// CMP-002 の検証ミドルウェア（BR-013）が一致を検証する。値は Secrets Manager 動的参照（IT-4）。
		const apiDomain = `${httpApi.apiId}.execute-api.${cdk.Aws.REGION}.amazonaws.com`;
		const apiOrigin = new origins.HttpOrigin(apiDomain, {
			customHeaders: {
				"x-origin-verify": originVerifySecret.secretValue.unsafeUnwrap(),
			},
		});

		const distribution = new cloudfront.Distribution(this, "Distribution", {
			defaultBehavior: {
				origin: s3Origin,
				viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
				cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
				responseHeadersPolicy,
			},
			additionalBehaviors: {
				"/api/*": {
					origin: apiOrigin,
					viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
					cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
					allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
					originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
				},
			},
			defaultRootObject: "index.html",
			errorResponses: [
				{
					httpStatus: 403,
					responseHttpStatus: 200,
					responsePagePath: "/index.html",
					ttl: cdk.Duration.minutes(5),
				},
				{
					httpStatus: 404,
					responseHttpStatus: 200,
					responsePagePath: "/index.html",
					ttl: cdk.Duration.minutes(5),
				},
			],
			priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
		});

		// --- S3 Deployment (Frontend build artifacts) ---
		new s3deploy.BucketDeployment(this, "DeployFrontend", {
			sources: [s3deploy.Source.asset(path.join(__dirname, "../../frontend/dist"))],
			destinationBucket: siteBucket,
			distribution,
			distributionPaths: ["/*"],
		});

		// --- Observability: SNS AlarmTopic + CloudWatch アラーム 4 種 ---
		// CH-8（QT-6 / D-4 / D-5 / RF-15）: パラメータは infrastructure-specification.md
		// 「アラームリソース定義」が正（IT-6/IT-7）。購読は手動（README 1 行 — 個人メールを構成に載せない）。
		const alarmTopic = new sns.Topic(this, "AlarmTopic", {
			displayName: "todo-app alarm notifications",
		});
		const alarmAction = new cloudwatchActions.SnsAction(alarmTopic);

		// 1. 主アラーム: Lambda Duration p95 > 500ms（QT-1 — NFR-001 の正式計測点。Init 除外はメトリクス定義）
		const lambdaDurationP95Alarm = new cloudwatch.Alarm(this, "LambdaDurationP95Alarm", {
			metric: todoFunction.metricDuration({
				statistic: "p95",
				period: cdk.Duration.minutes(5),
			}),
			threshold: 500,
			comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
			evaluationPeriods: 3,
			datapointsToAlarm: 3,
			treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
			alarmDescription: "QT-1: Lambda Duration p95 > 500ms (5min x 3/3)",
		});

		// 2. 補助アラーム: API GW Latency p99 > 1500ms（QT-2 — コールドスタート込み経路全体の異常検知）
		const apiLatencyP99Alarm = new cloudwatch.Alarm(this, "ApiLatencyP99Alarm", {
			metric: httpApi.metricLatency({
				statistic: "p99",
				period: cdk.Duration.minutes(5),
			}),
			threshold: 1500,
			comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
			evaluationPeriods: 3,
			datapointsToAlarm: 3,
			treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
			alarmDescription: "QT-2: API Gateway Latency p99 > 1500ms (5min x 3/3)",
		});

		// 3. Lambda Errors ≥ 1（未処理例外のみ — 400/403 のクライアント起因は乗らない）
		const lambdaErrorsAlarm = new cloudwatch.Alarm(this, "LambdaErrorsAlarm", {
			metric: todoFunction.metricErrors({
				statistic: "Sum",
				period: cdk.Duration.minutes(5),
			}),
			threshold: 1,
			comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			evaluationPeriods: 1,
			datapointsToAlarm: 1,
			treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
			alarmDescription: "QT-6: Lambda Errors >= 1 (5min x 1/1)",
		});

		// 4. API GW 5xx ≥ 1
		const api5xxAlarm = new cloudwatch.Alarm(this, "Api5xxAlarm", {
			metric: httpApi.metricServerError({
				statistic: "Sum",
				period: cdk.Duration.minutes(5),
			}),
			threshold: 1,
			comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			evaluationPeriods: 1,
			datapointsToAlarm: 1,
			treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
			alarmDescription: "QT-6: API Gateway 5xx >= 1 (5min x 1/1)",
		});

		for (const alarm of [
			lambdaDurationP95Alarm,
			apiLatencyP99Alarm,
			lambdaErrorsAlarm,
			api5xxAlarm,
		]) {
			alarm.addAlarmAction(alarmAction);
		}

		// --- Outputs ---
		new cdk.CfnOutput(this, "CloudFrontUrl", {
			value: `https://${distribution.distributionDomainName}`,
			description: "CloudFront Distribution URL",
		});

		// CH-9（Q1=a）: 維持 + 説明文更新 — QT-4 受入確認・障害切り分けの検証手段（意図した公開の明文化）
		new cdk.CfnOutput(this, "ApiUrl", {
			value: httpApi.apiEndpoint,
			description:
				"API Gateway HTTP API URL — オリジン検証により直接アクセスは 403（意図経路は CloudFront のみ）",
		});

		new cdk.CfnOutput(this, "TableName", {
			value: todoTable.tableName,
			description: "DynamoDB Table Name",
		});

		// CH-10（D-5）: SNS 購読手順（README 1 行）が参照する
		new cdk.CfnOutput(this, "AlarmTopicArn", {
			value: alarmTopic.topicArn,
			description: "SNS Alarm Topic ARN — アラーム通知の購読先（購読は手動: README 参照）",
		});
	}
}
