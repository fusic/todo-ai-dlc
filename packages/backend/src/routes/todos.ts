import { Hono } from "hono";
import { todoHandler } from "../handlers/todoHandler";

const todosRoute = new Hono();

todosRoute.get("/", todoHandler.list);
todosRoute.get("/:id", todoHandler.get);
todosRoute.post("/", todoHandler.create);
todosRoute.put("/:id", todoHandler.update);
todosRoute.delete("/:id", todoHandler.remove);

export { todosRoute };
