export function createId(prefix: string): string {
  const cryptoSource = globalThis.crypto;

  if (cryptoSource?.randomUUID) {
    return `${prefix}_${cryptoSource.randomUUID()}`;
  }

  const random = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${random}`;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function stableFallbackTaskId(path: string, line: number): string {
  return `legacy_${slugify(path)}_${line + 1}`;
}
