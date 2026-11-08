export function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "just now"
    : date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
}
