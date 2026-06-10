import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DeleteCommand,
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
	ScanCommand,
	UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Todo, UpdateTodoInput } from "@todo-ai-dlc/shared";

const client = new DynamoDBClient({
	region: process.env.AWS_REGION ?? "ap-northeast-1",
	...(process.env.DYNAMODB_ENDPOINT && {
		endpoint: process.env.DYNAMODB_ENDPOINT,
	}),
});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME ?? "TodoTable";

// BR-007（RF-07 / QT-9）: 存在判定と書込は ConditionExpression による単一のアトミック操作。
// 条件失敗（= 対象なし）は正常系の一部として null / false に写像し、その他の例外は 500 系（BR-012）へ伝播させる。
function isConditionalCheckFailed(error: unknown): boolean {
	return error instanceof Error && error.name === "ConditionalCheckFailedException";
}

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

	/**
	 * 部分更新（BR-006）。存在しない id は null を返す（BR-007 — DynamoDB 呼出 1 回のアトミック判定）。
	 */
	async update(id: string, input: UpdateTodoInput): Promise<Todo | null> {
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

		try {
			const result = await docClient.send(
				new UpdateCommand({
					TableName: tableName,
					Key: { id },
					ConditionExpression: "attribute_exists(id)",
					UpdateExpression: `SET ${expressionParts.join(", ")}`,
					ExpressionAttributeNames: expressionNames,
					ExpressionAttributeValues: expressionValues,
					ReturnValues: "ALL_NEW",
				}),
			);
			return result.Attributes as Todo;
		} catch (error) {
			if (isConditionalCheckFailed(error)) {
				return null;
			}
			throw error;
		}
	},

	/**
	 * 物理削除。存在しない id は false を返す（BR-007 — DynamoDB 呼出 1 回のアトミック判定）。
	 */
	async delete(id: string): Promise<boolean> {
		try {
			await docClient.send(
				new DeleteCommand({
					TableName: tableName,
					Key: { id },
					ConditionExpression: "attribute_exists(id)",
				}),
			);
			return true;
		} catch (error) {
			if (isConditionalCheckFailed(error)) {
				return false;
			}
			throw error;
		}
	},
};
