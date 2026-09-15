/**
 * Fills `{{current}}` and `{{total}}` in a progress template.
 * `index` is zero-based; `{{current}}` renders one-based, because a person reads it.
 */
export function formatProgress(template: string, index: number, total: number): string {
  return template
    .replace(/\{\{\s*current\s*\}\}/g, String(index + 1))
    .replace(/\{\{\s*total\s*\}\}/g, String(total));
}
