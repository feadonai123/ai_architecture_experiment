const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
