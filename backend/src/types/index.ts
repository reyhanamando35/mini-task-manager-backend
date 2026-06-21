export type TaskStatus = "to_do" | "pending" | "in_progress" | "done";

export const STATUS_ORDER: TaskStatus[] = ["to_do", "pending", "in_progress", "done"];

export const PREDEFINED_USERS = [
  "Joe",
  "Jane",
  "Alex",
  "Maria",
] as const;

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
  // Snapshot judul task saat perubahan terjadi. Disimpan di log-nya sendiri
  // supaya entri tetap terbaca ("... mengubah Task 'Prepare Invoice' ...")
  // walaupun task-nya sudah dihapus dan judulnya tidak ada lagi.
  taskTitle: string;
  actor: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  timestamp: string;
}
