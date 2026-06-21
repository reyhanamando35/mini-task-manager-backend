import { Task, AuditLog, TaskStatus } from "../types";

// Single source of truth for the predefined actor list is the backend
// (see backend/src/types/index.ts). The frontend fetches it via GET /users
// instead of duplicating the list, to keep frontend/backend consistent.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function handleResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }
  return body.data as T;
}

export async function fetchUsers(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/users`);
  return handleResponse<string[]>(res);
}

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(`${API_BASE}/tasks`);
  return handleResponse<Task[]>(res);
}

export async function createTask(title: string, description?: string): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description }),
  });
  return handleResponse<Task>(res);
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }
}

export async function updateTaskStatus(id: string, status: TaskStatus, actor: string): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, actor }),
  });
  return handleResponse<Task>(res);
}

export async function fetchAuditLogs(taskId: string): Promise<AuditLog[]> {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/audit-logs`);
  return handleResponse<AuditLog[]>(res);
}

// Global audit log across all tasks, including tasks that have been deleted.
export async function fetchAllAuditLogs(): Promise<AuditLog[]> {
  const res = await fetch(`${API_BASE}/audit-logs`);
  return handleResponse<AuditLog[]>(res);
}
