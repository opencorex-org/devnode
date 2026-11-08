export function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason);
}

export function isRunning(value: string) {
  return ["active", "running", "installed"].includes(value);
}

export function friendly(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
