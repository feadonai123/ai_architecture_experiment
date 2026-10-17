const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseNonEmptyArray(value: unknown): [unknown, ...unknown[]] | null {
  return Array.isArray(value) && value.length > 0
    ? (value as [unknown, ...unknown[]])
    : null;
}

function parseSafeInteger(value: unknown): number | null {
  const parsed =
    typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : typeof value === 'number'
        ? value
        : Number.NaN;
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parseNonNegativeNumber(value: unknown): number | null {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  return null;
}

export function parseOptionalBoolean(value: unknown): boolean | undefined | 'invalid' {
  if (value === undefined || value === '') {
    return undefined;
  }
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  return 'invalid';
}

export function parsePositiveInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

export function parseNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
}

export function parsePositiveSafeInteger(value: unknown): number | null {
  const parsed = parseSafeInteger(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

export function parseNonNegativeSafeInteger(value: unknown): number | null {
  const parsed = parseSafeInteger(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
}

export function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseUuid(value: unknown): string | null {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    return null;
  }
  return value;
}

export function parseString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
