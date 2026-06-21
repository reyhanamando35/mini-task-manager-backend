// Domain types shared across the backend layers (store -> services -> controllers).

export type TaskStatus = "to_do" | "pending" | "in_progress" | "done";

// Single source of truth for the allowed status order.
// A transition is only valid if it moves exactly one step forward in this array.
export const STATUS_ORDER: TaskStatus[] = ["to_do", "pending", "in_progress", "done"];

// Hardcoded predefined actor list, as allowed by the task brief.
// Exposed to the frontend via GET /users so both sides stay in sync
// with a single source of truth (this array) instead of duplicating it.
export const PREDEFINED_USERS = [
  "john.doe",
  "jane.smith",
  "alex.wong",
  "maria.garcia",
] as const;

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface AuditLog {
  id: string;
  taskId: string;
  actor: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  timestamp: string; // ISO timestamp
}
