import { useEffect, useState, useCallback } from "react";
import { Task } from "./types";
import * as api from "./api/client";
import { CreateTaskForm } from "./components/CreateTaskForm";
import { TaskItem } from "./components/TaskItem";

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      setError(null);
      const data = await api.fetchTasks();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [taskData, userData] = await Promise.all([api.fetchTasks(), api.fetchUsers()]);
        setTasks(taskData);
        setUsers(userData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load app data");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Mini Task Manager</h1>
        <p className="subtitle">Create tasks, advance their status, and review who changed what.</p>
      </header>

      <CreateTaskForm onCreated={loadTasks} />

      {error && <div className="banner banner-error">{error}</div>}

      {loading ? (
        <p className="loading">Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <p className="empty">No tasks yet. Create one above to get started.</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} users={users} onChanged={loadTasks} />
          ))}
        </ul>
      )}
    </div>
  );
}
