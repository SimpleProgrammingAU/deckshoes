/** Shows a value that was rejected as input in an error message, without calling into it. */
export function display(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (
    (typeof value === "object" && value !== null) ||
    typeof value === "function"
  ) {
    return `(${typeof value})`;
  }
  return String(value);
}
