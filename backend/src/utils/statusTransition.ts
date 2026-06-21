import { TaskStatus, STATUS_ORDER } from "../types";

/**
 * A transition is valid only if it moves exactly one step forward
 * through STATUS_ORDER. No skipping ahead, no moving backward.
 *
 * Assumption (documented in README): "hanya mengikuti urutan" is read
 * strictly - to_do -> pending -> in_progress -> done, one step at a time.
 */
export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  const fromIndex = STATUS_ORDER.indexOf(from);
  const toIndex = STATUS_ORDER.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex === fromIndex + 1;
}
