import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { TodoStack } from "../lib/todo-stack";

const app = new cdk.App();
const stack = new TodoStack(app, "TestStack", {
	env: { region: "ap-northeast-1", account: "123456789012" },
});
const template = Template.fromStack(stack);

describe("TodoStack", () => {
	it("creates DynamoDB table with on-demand billing", () => {
		template.hasResourceProperties("AWS::DynamoDB::Table", {
			BillingMode: "PAY_PER_REQUEST",
			KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
			PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
		});
	});

	it("creates Lambda function with correct configuration", () => {
		template.hasResourceProperties("AWS::Lambda::Function", {
			Runtime: "nodejs20.x",
			MemorySize: 256,
			Timeout: 30,
		});
	});

	it("creates S3 bucket with block public access", () => {
		template.hasResourceProperties("AWS::S3::Bucket", {
			PublicAccessBlockConfiguration: {
				BlockPublicAcls: true,
				BlockPublicPolicy: true,
				IgnorePublicAcls: true,
				RestrictPublicBuckets: true,
			},
		});
	});

	it("creates CloudFront distribution", () => {
		template.resourceCountIs("AWS::CloudFront::Distribution", 1);
	});

	it("creates API Gateway HTTP API", () => {
		template.hasResourceProperties("AWS::ApiGatewayV2::Api", {
			ProtocolType: "HTTP",
		});
	});

	it("has CloudFront URL output", () => {
		template.hasOutput("CloudFrontUrl", {});
	});

	it("has API URL output", () => {
		template.hasOutput("ApiUrl", {});
	});
});

// IT-1〜IT-10（infrastructure-specification.md「Infrastructure テスト assert 項目」が正）
describe("TodoStack — infrastructure assertions (IT-1〜IT-10)", () => {
	it("IT-1: Lambda 実行ロールの DynamoDB ポリシーがちょうど 5 アクション（Resource = TodoTable ARN）である (QT-5 / RF-14)", () => {
		const policies = template.findResources("AWS::IAM::Policy");
		const dynamoStatements = Object.values(policies)
			.flatMap((policy) => policy.Properties.PolicyDocument.Statement as unknown[])
			.filter((statement) => JSON.stringify(statement).includes("dynamodb:"));

		// DynamoDB に触れる IAM ステートメントは TodoApiFunction 実行ロールの 1 つのみ
		expect(dynamoStatements).toHaveLength(1);
		const statement = dynamoStatements[0] as {
			Action: string[];
			Effect: string;
			Resource: unknown;
		};
		expect([...statement.Action].sort()).toEqual([
			"dynamodb:DeleteItem",
			"dynamodb:GetItem",
			"dynamodb:PutItem",
			"dynamodb:Scan",
			"dynamodb:UpdateItem",
		]);
		expect(statement.Effect).toBe("Allow");
		// Resource は TodoTable の ARN（GetAtt）のみを参照する（grantReadWriteData の広い付与からの置換 — AR-O3 解消）
		expect(JSON.stringify(statement.Resource)).toContain('["TodoTable');
	});

	it("IT-2: AWS::ApiGatewayV2::Api に CorsConfiguration が存在しない (RF-12)", () => {
		const apis = template.findResources("AWS::ApiGatewayV2::Api");
		expect(Object.keys(apis).length).toBeGreaterThan(0);
		for (const api of Object.values(apis)) {
			expect(api.Properties.CorsConfiguration).toBeUndefined();
		}
	});

	it("IT-3: Secrets Manager Secret が GenerateSecretString 付きで存在し、平文 SecretString 直指定がない (QT-4 / D-2)", () => {
		template.hasResourceProperties("AWS::SecretsManager::Secret", {
			GenerateSecretString: Match.objectLike({
				PasswordLength: 32,
				ExcludePunctuation: true,
			}),
		});
		const secrets = template.findResources("AWS::SecretsManager::Secret");
		for (const secret of Object.values(secrets)) {
			expect(secret.Properties.SecretString).toBeUndefined();
		}
	});

	it("IT-4: CloudFront /api/* オリジンの OriginCustomHeaders に x-origin-verify があり、値が動的参照（平文 0 件）である (QT-4)", () => {
		const distributions = template.findResources("AWS::CloudFront::Distribution");
		const origins = Object.values(distributions).flatMap(
			(distribution) => distribution.Properties.DistributionConfig.Origins as unknown[],
		);
		const apiOrigins = origins.filter((origin) =>
			JSON.stringify(origin).includes("x-origin-verify"),
		);
		expect(apiOrigins).toHaveLength(1);
		const customHeaders = (
			apiOrigins[0] as {
				OriginCustomHeaders: { HeaderName: string; HeaderValue: unknown }[];
			}
		).OriginCustomHeaders;
		const verifyHeader = customHeaders.find((header) => header.HeaderName === "x-origin-verify");
		expect(verifyHeader).toBeDefined();
		// 値は CloudFormation 動的参照（{{resolve:secretsmanager:...}}）— テンプレートに平文値が現れない
		expect(JSON.stringify(verifyHeader?.HeaderValue)).toContain("{{resolve:secretsmanager:");
	});

	it("IT-5: Lambda 環境変数 ORIGIN_VERIFY_SECRET の値が Secrets Manager 動的参照である (QT-4)", () => {
		const functions = template.findResources("AWS::Lambda::Function");
		const apiFunctions = Object.values(functions).filter(
			(fn) => fn.Properties.Environment?.Variables?.ORIGIN_VERIFY_SECRET !== undefined,
		);
		expect(apiFunctions).toHaveLength(1);
		const value = apiFunctions[0].Properties.Environment.Variables.ORIGIN_VERIFY_SECRET;
		expect(JSON.stringify(value)).toContain("{{resolve:secretsmanager:");
	});

	it("IT-6: CloudWatch Alarm 4 種のメトリクス・statistic・閾値・period・datapoints・TreatMissingData が定義どおりである (QT-1/QT-2/QT-6/RF-15)", () => {
		template.resourceCountIs("AWS::CloudWatch::Alarm", 4);

		// 1. 主: Lambda Duration p95 > 500ms（5 分 × 3/3）
		template.hasResourceProperties("AWS::CloudWatch::Alarm", {
			Namespace: "AWS/Lambda",
			MetricName: "Duration",
			ExtendedStatistic: "p95",
			Threshold: 500,
			ComparisonOperator: "GreaterThanThreshold",
			Period: 300,
			EvaluationPeriods: 3,
			DatapointsToAlarm: 3,
			TreatMissingData: "notBreaching",
		});
		// 2. 補助: API GW Latency p99 > 1500ms（5 分 × 3/3）
		template.hasResourceProperties("AWS::CloudWatch::Alarm", {
			Namespace: "AWS/ApiGateway",
			MetricName: "Latency",
			ExtendedStatistic: "p99",
			Threshold: 1500,
			ComparisonOperator: "GreaterThanThreshold",
			Period: 300,
			EvaluationPeriods: 3,
			DatapointsToAlarm: 3,
			TreatMissingData: "notBreaching",
		});
		// 3. Lambda Errors Sum ≥ 1（5 分 × 1/1）
		template.hasResourceProperties("AWS::CloudWatch::Alarm", {
			Namespace: "AWS/Lambda",
			MetricName: "Errors",
			Statistic: "Sum",
			Threshold: 1,
			ComparisonOperator: "GreaterThanOrEqualToThreshold",
			Period: 300,
			EvaluationPeriods: 1,
			DatapointsToAlarm: 1,
			TreatMissingData: "notBreaching",
		});
		// 4. API GW 5xx Sum ≥ 1（5 分 × 1/1）
		template.hasResourceProperties("AWS::CloudWatch::Alarm", {
			Namespace: "AWS/ApiGateway",
			MetricName: "5xx",
			Statistic: "Sum",
			Threshold: 1,
			ComparisonOperator: "GreaterThanOrEqualToThreshold",
			Period: 300,
			EvaluationPeriods: 1,
			DatapointsToAlarm: 1,
			TreatMissingData: "notBreaching",
		});
	});

	it("IT-7: SNS トピックが存在し、4 アラームすべての AlarmActions が同トピックを参照する (QT-6 / D-5)", () => {
		template.resourceCountIs("AWS::SNS::Topic", 1);
		const topicLogicalId = Object.keys(template.findResources("AWS::SNS::Topic"))[0];
		const alarms = template.findResources("AWS::CloudWatch::Alarm");
		expect(Object.keys(alarms)).toHaveLength(4);
		for (const alarm of Object.values(alarms)) {
			expect(alarm.Properties.AlarmActions).toEqual([{ Ref: topicLogicalId }]);
		}
	});

	it("IT-8: Lambda の LoggingConfig が明示 LogGroup（90 日保持）を参照し、Custom::LogRetention が存在しない (RF-17 / C-1)", () => {
		template.resourceCountIs("Custom::LogRetention", 0);
		template.hasResourceProperties("AWS::Lambda::Function", {
			LoggingConfig: {
				LogGroup: { Ref: Match.stringLikeRegexp("^TodoApiFunctionLogGroup") },
			},
		});
		// 参照先 LogGroup の retention = 90 日（logGroupName 指定なし = CDK 一意名）
		const logGroups = template.findResources("AWS::Logs::LogGroup");
		const functionLogGroups = Object.entries(logGroups).filter(([logicalId]) =>
			logicalId.startsWith("TodoApiFunctionLogGroup"),
		);
		expect(functionLogGroups).toHaveLength(1);
		expect(functionLogGroups[0][1].Properties.RetentionInDays).toBe(90);
		expect(functionLogGroups[0][1].Properties.LogGroupName).toBeUndefined();
	});

	it("IT-9: DynamoDB の PITR 移行・課金モード・固定テーブル名に退行がない (RF-17 / C-1 / C-4)", () => {
		template.hasResourceProperties("AWS::DynamoDB::Table", {
			PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
			BillingMode: "PAY_PER_REQUEST",
			TableName: "TodoTable",
		});
	});

	it("IT-10: VPC 関連リソースが存在せず、ApiUrl / AlarmTopicArn の CfnOutput が存在する (QT-3 / Q1 / D-5)", () => {
		template.resourceCountIs("AWS::EC2::VPC", 0);
		template.resourceCountIs("AWS::EC2::Subnet", 0);
		template.resourceCountIs("AWS::EC2::SecurityGroup", 0);
		// CH-9（Q1=a）: ApiUrl は維持し、説明文に「直接アクセスは 403」を明記する
		template.hasOutput("ApiUrl", {
			Description: Match.stringLikeRegexp("403"),
		});
		template.hasOutput("AlarmTopicArn", {});
	});
});
