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
