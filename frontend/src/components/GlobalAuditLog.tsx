import { useEffect, useState } from "react";
import { AuditLog } from "../types";
import * as api from "../api/client";

interface Props {
  // List of task ids that still exist, so logs whose task has been deleted
  // can be marked. The audit log itself is kept regardless.
  activeTaskIds: string[];
  // Bumped by the parent whenever something changes (e.g. a status advance or
  // a delete) so an already-open panel refetches and stays in sync.
  refreshKey: number;
}

export function GlobalAuditLog({ activeTaskIds, refreshKey }: Props) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only fetch while the panel is open. Re-runs when refreshKey changes so a
  // status change elsewhere updates this list without a manual reload.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.fetchAllAuditLogs();
        if (!cancelled) setLogs(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load audit log");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, refreshKey]);

  const active = new Set(activeTaskIds);

  return (
    <section className="global-audit">
      <div className="global-audit-header">
        <h2>Semua Audit Log</h2>
        <button className="secondary" onClick={() => setOpen((v) => !v)}>
          {open ? "Sembunyikan" : "Lihat semua riwayat"}
        </button>
      </div>

      {open && (
        <div className="audit-log">
          {error && <div className="banner banner-error small">{error}</div>}
          {loading ? (
            <p className="loading">Memuat riwayat…</p>
          ) : logs.length === 0 ? (
            <p className="empty small">Belum ada perubahan status apa pun.</p>
          ) : (
            <ul>
              {logs.map((log) => (
                <li key={log.id}>
                  {log.actor} mengubah Task &quot;{log.taskTitle}&quot; dari &quot;{log.fromStatus}
                  &quot; ke &quot;{log.toStatus}&quot; pada {new Date(log.timestamp).toLocaleString()}
                  {!active.has(log.taskId) && <span className="deleted-tag"> (task dihapus)</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
