export function now(): Date {
  return new Date();
}

export function toIsoUtc(date: Date): string {
  return date.toISOString();
}

export function plusMilliseconds(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}
