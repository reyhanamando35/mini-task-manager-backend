import { useState } from "react";
import { Task, AuditLog, STATUS_ORDER } from "../types";
import * as api from "../api/client";
import { StatusBadge } from "./StatusBadge";

interface Props {
  task: Task;
  users: string[];
  onChanged: () => void;
}

export function TaskItem({ task, users, onChanged }: Props) {
  const [actor, setActor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const currentIndex = STATUS_ORDER.indexOf(task.status);
  const nextStatus = STATUS_ORDER[currentIndex + 1];

  // Fetches the latest audit log for this task. Shared by the "View History"
  // toggle and by handleAdvance() so a status change can refresh the history
  // in place instead of waiting for the user to re-open the panel.
  async function loadLogs() {
    const data = await api.fetchAuditLogs(task.id);
    setLogs(data);
  }

  async function handleAdvance() {
    if (!actor) {
      setError("Select an actor before changing status");
      return;
    }
    if (!nextStatus) return;
    try {
      setBusy(true);
      setError(null);
      await api.updateTaskStatus(task.id, nextStatus, actor);
      onChanged();
      // Show the new entry right away: refresh the log and open the history
      // panel so the change is visible immediately, not after a manual click.
      await loadLogs();
      setShowHistory(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete task "${task.title}"? This cannot be undone.`)) return;
    try {
      setBusy(true);
      setError(null);
      await api.deleteTask(task.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setBusy(false);
    }
  }

  async function toggleHistory() {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    try {
      setLogsLoading(true);
      setError(null);
      await loadLogs();
      setShowHistory(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLogsLoading(false);
    }
  }

  return (
    <li className="task-item">
      <div className="task-row">
        <div className="task-main">
          <div className="task-title-row">
            <strong>{task.title}</strong>
            <StatusBadge status={task.status} />
          </div>
          {task.description && <p className="task-desc">{task.description}</p>}
          <p className="task-meta">Updated {new Date(task.updatedAt).toLocaleString()}</p>
        </div>

        <div className="task-actions">
          <select
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            disabled={!nextStatus || busy}
            aria-label="Select actor"
          >
            <option value="">Select actor…</option>
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <button onClick={handleAdvance} disabled={busy || !nextStatus}>
            {nextStatus ? `Advance to ${nextStatus}` : "Completed"}
          </button>
          <button onClick={toggleHistory} disabled={logsLoading} className="secondary">
            {showHistory ? "Hide History" : "View History"}
          </button>
          <button onClick={handleDelete} disabled={busy} className="danger">
            Delete
          </button>
        </div>
      </div>

      {error && <div className="banner banner-error small">{error}</div>}

      {showHistory && (
        <div className="audit-log">
          {logs.length === 0 ? (
            <p className="empty small">No status changes yet.</p>
          ) : (
            <ul>
              {logs.map((log) => (
                <li key={log.id}>
                  User &quot;{log.actor}&quot; changed status from &quot;{log.fromStatus}&quot; to &quot;
                  {log.toStatus}&quot; at {new Date(log.timestamp).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
