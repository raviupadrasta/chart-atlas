import { profileColumn } from "./infer.js";
import type { DatasetProfile, ProfileOptions, Row } from "./types.js";
import { buildViews } from "./views.js";

export type * from "./types.js";
export { profileColumn } from "./infer.js";

/**
 * Profile a dataset given as rows. Columns are the union of keys in order of
 * first appearance; a row missing a key counts as a missing value for it.
 * `views` lists candidate ways to chart the data, best first; `options.pin` keeps only
 * views that use the named columns. The result is plain JSON-safe data.
 */
export function profileDataset(rows: Row[], options: ProfileOptions = {}): DatasetProfile {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        names.push(key);
      }
    }
  }
  const columns = names.map((name) =>
    profileColumn(
      name,
      rows.map((r) => r[name]),
    ),
  );
  return { rowCount: rows.length, columnCount: columns.length, columns, views: buildViews(rows, columns, options) };
}
