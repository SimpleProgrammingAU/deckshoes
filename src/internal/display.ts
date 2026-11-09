/** How many characters (code points) of a rejected string an error message shows. */
const MAX_LENGTH = 30;

/** Shows a value that was rejected as input in an error message, without calling into it. */
export function display(value: unknown): string {
  if (typeof value === "string") {
    // The first MAX_LENGTH code points, so a character such as an emoji is
    // never split. They fit in twice as many UTF-16 units, and any code point
    // that slice splits comes after them.
    const shown = Array.from(value.slice(0, 2 * MAX_LENGTH))
      .slice(0, MAX_LENGTH)
      .join("");
    return shown.length < value.length
      ? `${JSON.stringify(shown)}…`
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
