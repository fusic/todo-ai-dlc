import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	DeleteCommand,
	GetCommand,
	PutCommand,
	ScanCommand,
	UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Todo, UpdateTodoInput } from "../types/todo";

const client = new DynamoDBClient({
	region: process.env.AWS_REGION ?? "ap-northeast-1",
	...(process.env.DYNAMODB_ENDPOINT && {
		endpoint: process.env.DYNAMODB_ENDPOINT,
	}),
});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME ?? "TodoTable";

export const todoRepository = {
	async findAll(): Promise<Todo[]> {
		const result = await docClient.send(new ScanCommand({ TableName: tableName }));
		return (result.Items as Todo[]) ?? [];
	},

	async findById(id: string): Promise<Todo | null> {
		const result = await docClient.send(
			new GetCommand({
				TableName: tableName,
				Key: { id },
			}),
		);
		return (result.Item as Todo) ?? null;
	},

	async create(todo: Todo): Promise<Todo> {
		await docClient.send(
			new PutCommand({
				TableName: tableName,
				Item: todo,
			}),
		);
		return todo;
	},

	async update(id: string, input: UpdateTodoInput): Promise<Todo> {
		const now = new Date().toISOString();
		const expressionParts: string[] = [];
		const expressionNames: Record<string, string> = {};
		const expressionValues: Record<string, unknown> = {};

		if (input.title !== undefined) {
			expressionParts.push("#title = :title");
			expressionNames["#title"] = "title";
			expressionValues[":title"] = input.title;
		}
		if (input.description !== undefined) {
			expressionParts.push("#description = :description");
			expressionNames["#description"] = "description";
			expressionValues[":description"] = input.description;
		}
		if (input.completed !== undefined) {
			expressionParts.push("#completed = :completed");
			expressionNames["#completed"] = "completed";
			expressionValues[":completed"] = input.completed;
		}

		expressionParts.push("#updatedAt = :updatedAt");
		expressionNames["#updatedAt"] = "updatedAt";
		expressionValues[":updatedAt"] = now;

		const result = await docClient.send(
			new UpdateCommand({
				TableName: tableName,
				Key: { id },
				UpdateExpression: `SET ${expressionParts.join(", ")}`,
				ExpressionAttributeNames: expressionNames,
				ExpressionAttributeValues: expressionValues,
				ReturnValues: "ALL_NEW",
			}),
		);

		return result.Attributes as Todo;
	},

	async delete(id: string): Promise<void> {
		await docClient.send(
			new DeleteCommand({
				TableName: tableName,
				Key: { id },
			}),
		);
	},
};
