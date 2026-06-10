// CMP-003 Shared Contract — 型定義の単一ソース（RF-03 / ENT-001）
// CMP-001（frontend）/ CMP-002（backend）はここから import する。
// zod schema との整合は schemas.test.ts の型レベルアサーションで担保する（BR-014）。

/** Todo エンティティ（ENT-001 — 属性 6 件。所有・強制点は CMP-002） */
export interface Todo {
	/** ULID（26 文字、辞書順 = 生成時刻順）。サーバー生成（BR-003） */
	id: string;
	/** 必須、1〜200 文字（BR-001） */
	title: string;
	/** 任意、最大 1000 文字（BR-002） */
	description?: string;
	/** 作成時 false 固定（BR-004） */
	completed: boolean;
	/** ISO 8601。作成時にサーバーが付与、以後不変（BR-005） */
	createdAt: string;
	/** ISO 8601。更新のたびにサーバーが更新（BR-005） */
	updatedAt: string;
}

/** 作成入力（API-001）。id / completed / タイムスタンプはサーバー管轄のため存在しない（BR-003〜005） */
export interface CreateTodoInput {
	title: string;
	description?: string;
}

/** 更新入力（API-004）。部分更新意味論 — 空オブジェクトも有効（BR-006） */
export interface UpdateTodoInput {
	title?: string;
	description?: string;
	completed?: boolean;
}
