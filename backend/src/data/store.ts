import { Task, AuditLog } from "../types";

/**
 * In-memory data store.
 *
 * Trade-off (documented in README): zero setup and fast to review, but data
 * does not survive a process restart and there is no real concurrency control.
 * See README "Trade-offs" and the risk/refactor answers for the implications.
 *
 * IMPORTANT: notice there is no updateAuditLog() or deleteAuditLog() method.
 * That is intentional, not an omission - it is the mechanism that guarantees
 * audit logs can never be modified or removed once written. The only audit
 * log operations that exist anywhere in this codebase are "append" and "read".
 */
class InMemoryStore {
  private tasks: Map<string, Task> = new Map();
  private auditLogs: AuditLog[] = [];

  // ---- Tasks ----

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  getTaskById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  createTask(task: Task): Task {
    this.tasks.set(task.id, task);
    return task;
  }

  updateTask(task: Task): Task {
    this.tasks.set(task.id, task);
    return task;
  }

  deleteTask(id: string): boolean {
    // Note: this only removes the task itself. Its audit logs are
    // deliberately left in place - see README "Assumptions".
    return this.tasks.delete(id);
  }

  // ---- Audit Logs (append-only) ----

  appendAuditLog(log: AuditLog): AuditLog {
    this.auditLogs.push(log);
    return log;
  }

  getAuditLogsByTaskId(taskId: string): AuditLog[] {
    return this.auditLogs
      .filter((log) => log.taskId === taskId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}

// Single shared instance for the lifetime of the process.
export const store = new InMemoryStore();
