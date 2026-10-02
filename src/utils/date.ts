export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function toDateInputValue(value?: string): string {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

export function toDateTimeInputValue(value?: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function fromDateTimeInputValue(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

export function formatDate(value: string, format: string): string {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) {
    return value;
  }

  if (format === "DD/MM/YYYY") {
    return `${day}/${month}/${year}`;
  }

  if (format === "DD/MM") {
    return `${day}/${month}`;
  }

  return `${year}-${month}-${day}`;
}
