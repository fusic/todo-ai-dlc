// CMP-003 Shared Contract — zod 検証 schema（CMP-002 専用の公開面 — BR-014 / Q4=a）
// CMP-001 はこのエントリを import してはならない（強制点の単一性 — 検証は CMP-002 の API 境界のみ）。
import { z } from "zod";
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from "./constants";

/** 作成入力の検証 schema（API-001 — BR-001 / BR-002） */
export const CreateTodoSchema = z.object({
	title: z
		.string()
		.min(1, "Title is required")
		.max(TITLE_MAX_LENGTH, `Title must be ${TITLE_MAX_LENGTH} characters or less`),
	description: z
		.string()
		.max(DESCRIPTION_MAX_LENGTH, `Description must be ${DESCRIPTION_MAX_LENGTH} characters or less`)
		.optional(),
});

/** 更新入力の検証 schema（API-004 — BR-001 / BR-002 / BR-006: 空オブジェクトも有効） */
export const UpdateTodoSchema = z.object({
	title: z
		.string()
		.min(1, "Title is required")
		.max(TITLE_MAX_LENGTH, `Title must be ${TITLE_MAX_LENGTH} characters or less`)
		.optional(),
	description: z
		.string()
		.max(DESCRIPTION_MAX_LENGTH, `Description must be ${DESCRIPTION_MAX_LENGTH} characters or less`)
		.optional(),
	completed: z.boolean().optional(),
});
