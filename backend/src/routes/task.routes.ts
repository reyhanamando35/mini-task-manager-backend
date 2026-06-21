import { Router } from "express";
import * as taskController from "../controllers/task.controller";

const router = Router();

router.get("/users", taskController.getUsers);

router.get("/tasks", taskController.getTasks);
router.post("/tasks", taskController.postTask);
router.delete("/tasks/:id", taskController.deleteTaskHandler);
router.put("/tasks/:id/status", taskController.putTaskStatus);
router.get("/tasks/:id/audit-logs", taskController.getTaskAuditLogs);

export default router;
