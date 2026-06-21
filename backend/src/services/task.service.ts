import crypto from "crypto";
import { store } from "../data/store";
import { Task, TaskStatus, STATUS_ORDER } from "../types";
import { isValidTransition } from "../utils/statusTransition";
import { recordStatusChange } from "./auditLog.service";

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export function listTasks(): Task[] {
  return store.getAllTasks();
}

export function createTask(title: string, description?: string): Task {
  if (!title || !title.trim()) {
    throw new DomainError("Task title is required");
  }
  const now = new Date().toISOString();
  const task: Task = {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: description?.trim() || undefined,
    status: "to_do",
    createdAt: now,
    updatedAt: now,
  };
  return store.createTask(task);
}

export function deleteTask(id: string): void {
  const existing = store.getTaskById(id);
  if (!existing) {
    throw new NotFoundError(`Task ${id} not found`);
  }
  store.deleteTask(id);
}

export interface StatusUpdateResult {
  task: Task;
  logCreated: boolean;
}

export function updateTaskStatus(id: string, actor: string, newStatus: TaskStatus): StatusUpdateResult {
  const task = store.getTaskById(id);
  if (!task) {
    throw new NotFoundError(`Task ${id} not found`);
  }

  if (!STATUS_ORDER.includes(newStatus)) {
    throw new DomainError(
      `Invalid status value "${newStatus}". Must be one of: ${STATUS_ORDER.join(", ")}`,
    );
  }

  if (task.status === newStatus) {
    return { task, logCreated: false };
  }

  if (!isValidTransition(task.status, newStatus)) {
    throw new DomainError(
      `Invalid status transition from "${task.status}" to "${newStatus}". ` +
        `Tasks can only move forward one step at a time: ${STATUS_ORDER.join(" -> ")}.`,
    );
  }

  const previousStatus = task.status;
  const updatedTask: Task = {
    ...task,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
  store.updateTask(updatedTask);
  recordStatusChange(id, task.title, actor, previousStatus, newStatus);

  return { task: updatedTask, logCreated: true };
}
