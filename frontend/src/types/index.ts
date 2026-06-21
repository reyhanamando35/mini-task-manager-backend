export type TaskStatus = "to_do" | "pending" | "in_progress" | "done";

export const STATUS_ORDER: TaskStatus[] = ["to_do", "pending", "in_progress", "done"];

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  taskId: string;
  taskTitle: string; // snapshot judul task saat perubahan, lihat backend/src/types
  actor: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  timestamp: string;
}
