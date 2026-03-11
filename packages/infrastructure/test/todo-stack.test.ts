import { describe, it, expect } from "vitest";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { TodoStack } from "../lib/todo-stack";

describe("TodoStack", () => {
	const app = new cdk.App();
	const stack = new TodoStack(app, "TestStack", {
		env: { region: "ap-northeast-1", account: "123456789012" },
	});
	const template = Template.fromStack(stack);

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
