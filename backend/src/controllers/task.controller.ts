import { Request, Response } from "express";
import * as taskService from "../services/task.service";
import * as auditLogService from "../services/auditLog.service";
import { DomainError, NotFoundError } from "../services/task.service";
import { PREDEFINED_USERS, TaskStatus } from "../types";

export function getUsers(_req: Request, res: Response) {
  res.json({ data: PREDEFINED_USERS });
}

export function getTasks(_req: Request, res: Response) {
  res.json({ data: taskService.listTasks() });
}

export function postTask(req: Request, res: Response) {
  try {
    const { title, description } = req.body ?? {};
    const task = taskService.createTask(title, description);
    res.status(201).json({ data: task });
  } catch (err) {
    handleError(err, res);
  }
}

export function deleteTaskHandler(req: Request, res: Response) {
  try {
    taskService.deleteTask(req.params.id);
    res.status(204).send();
  } catch (err) {
    handleError(err, res);
  }
}

export function putTaskStatus(req: Request, res: Response) {
  try {
    const { status, actor } = req.body ?? {};

    if (!actor || !(PREDEFINED_USERS as readonly string[]).includes(actor)) {
      return res.status(400).json({
        error: `"actor" is required and must be one of: ${PREDEFINED_USERS.join(", ")}`,
      });
    }

    const result = taskService.updateTaskStatus(req.params.id, actor, status as TaskStatus);
    res.status(200).json({ data: result.task, logCreated: result.logCreated });
  } catch (err) {
    handleError(err, res);
  }
}

export function getTaskAuditLogs(req: Request, res: Response) {
  res.json({ data: auditLogService.getAuditLogsForTask(req.params.id) });
}

export function getAllAuditLogs(_req: Request, res: Response) {
  res.json({ data: auditLogService.getAllAuditLogs() });
}

function handleError(err: unknown, res: Response) {
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof DomainError) {
    return res.status(400).json({ error: err.message });
  }
  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
