// A table written as a record lets TypeScript check it has every key and no
// others. Looking it up through a Map means a key such as "constructor" finds
// nothing, and a value that isn't a string is never converted to one.

/** Turns a table into a `Map` holding only the table's own keys. */
export function lookup<K extends string, V>(
  table: Readonly<Record<K, V>>,
): ReadonlyMap<K, V> {
  return new Map(Object.entries(table) as [K, V][]);
}
