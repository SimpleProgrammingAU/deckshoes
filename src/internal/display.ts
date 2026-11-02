/** How many characters of a rejected string an error message shows. */
const MAX_LENGTH = 30;

/** Shows a value that was rejected as input in an error message, without calling into it. */
export function display(value: unknown): string {
  if (typeof value === "string") {
    return value.length > MAX_LENGTH
      ? `${JSON.stringify(value.slice(0, MAX_LENGTH))}…`
      : JSON.stringify(value);
  }
  if (typeof value === "bigint") return `${String(value)}n`;
  if (
    (typeof value === "object" && value !== null) ||
    typeof value === "function"
  ) {
    return `(${typeof value})`;
  }
  return String(value);
}
