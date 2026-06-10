import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
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
			pointInTimeRecovery: true,
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
			},
			bundling: {
				format: OutputFormat.ESM,
				minify: true,
				sourceMap: true,
				target: "node20",
				externalModules: ["@aws-sdk/*"],
			},
			logRetention: logs.RetentionDays.THREE_MONTHS, // SECURITY-14
		});

		// SECURITY-06: Least privilege — grant specific DynamoDB actions
		todoTable.grantReadWriteData(todoFunction);

		// --- API Gateway (HTTP API) ---
		const lambdaIntegration = new HttpLambdaIntegration("TodoLambdaIntegration", todoFunction);

		const httpApi = new apigatewayv2.HttpApi(this, "TodoHttpApi", {
			apiName: "TodoApi",
			corsPreflight: {
				allowOrigins: ["*"],
				allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
				allowHeaders: ["Content-Type", "Authorization"],
			},
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
		const apiDomain = `${httpApi.apiId}.execute-api.${cdk.Aws.REGION}.amazonaws.com`;
		const apiOrigin = new origins.HttpOrigin(apiDomain);

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

		// --- Outputs ---
		new cdk.CfnOutput(this, "CloudFrontUrl", {
			value: `https://${distribution.distributionDomainName}`,
			description: "CloudFront Distribution URL",
		});

		new cdk.CfnOutput(this, "ApiUrl", {
			value: httpApi.apiEndpoint,
			description: "API Gateway HTTP API URL",
		});

		new cdk.CfnOutput(this, "TableName", {
			value: todoTable.tableName,
			description: "DynamoDB Table Name",
		});
	}
}
