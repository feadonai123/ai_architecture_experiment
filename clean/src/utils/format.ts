export function formatIsoDateTime(date: Date): string {
  return new Date(date).toISOString();
}

export function formatMoney(value: number): string {
  return value.toFixed(2);
}

export function formatUuid(id: string): string {
  return id.toLowerCase();
}
