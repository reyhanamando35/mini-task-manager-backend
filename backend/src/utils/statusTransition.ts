import { TaskStatus, STATUS_ORDER } from "../types";

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  const fromIndex = STATUS_ORDER.indexOf(from);
  const toIndex = STATUS_ORDER.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex === fromIndex + 1;
}
