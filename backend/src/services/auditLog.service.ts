import crypto from "crypto";
import { store } from "../data/store";
import { AuditLog, TaskStatus } from "../types";

/**
 * Records a status change. This is only ever called internally from
 * task.service.updateTaskStatus() right after a transition is validated -
 * there is no public API route that lets a client create a log entry
 * directly with arbitrary data.
 */
export function recordStatusChange(
  taskId: string,
  actor: string,
  fromStatus: TaskStatus,
  toStatus: TaskStatus,
): AuditLog {
  const log: AuditLog = {
    id: crypto.randomUUID(),
    taskId,
    actor,
    fromStatus,
    toStatus,
    timestamp: new Date().toISOString(),
  };
  return store.appendAuditLog(log);
}

export function getAuditLogsForTask(taskId: string): AuditLog[] {
  return store.getAuditLogsByTaskId(taskId);
}
