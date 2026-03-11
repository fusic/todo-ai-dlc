import { z } from "zod";

// --- Interfaces ---

export interface Todo {
	id: string;
	title: string;
	description?: string;
	completed: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface CreateTodoInput {
	title: string;
	description?: string;
}

export interface UpdateTodoInput {
	title?: string;
	description?: string;
	completed?: boolean;
}

// --- Zod Validation Schemas (SECURITY-05) ---

export const CreateTodoSchema = z.object({
	title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
	description: z
		.string()
		.max(1000, "Description must be 1000 characters or less")
		.optional(),
});

export const UpdateTodoSchema = z.object({
	title: z
		.string()
		.min(1, "Title is required")
		.max(200, "Title must be 200 characters or less")
		.optional(),
	description: z
		.string()
		.max(1000, "Description must be 1000 characters or less")
		.optional(),
	completed: z.boolean().optional(),
});
