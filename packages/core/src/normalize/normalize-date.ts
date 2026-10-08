import type { CellValue } from '../types.js';
import { normalizeEmpty } from './normalize-empty.js';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
/** Strict ISO-like forms only — never use loose `Date.parse` (it accepts "10.5"). */
const DATETIME_OFFSET =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})$/;
const DATE_SLASH = /^(\d{4})\/(\d{2})\/(\d{2})$/;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDateOnly(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function formatDateTimeUtc(d: Date): string {
  return d.toISOString();
}

/**
 * Excel serial date → UTC Date. SheetJS uses the 1900 date system with the
 * Lotus leap-year bug; we mirror the common epoch used by SheetJS.
 */
export function excelSerialToDate(serial: number): Date {
  // Days since 1899-12-30 (SheetJS / Excel 1900 system)
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const fractionalDay = serial - Math.floor(serial) + 1e-10;
  let totalSeconds = Math.floor(86400 * fractionalDay);
  const seconds = totalSeconds % 60;
  totalSeconds -= seconds;
  const hours = Math.floor(totalSeconds / (60 * 60));
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const date = new Date(utcValue * 1000);
  date.setUTCHours(hours, minutes, seconds, 0);
  return date;
}

function hasTimeComponent(d: Date): boolean {
  return (
    d.getUTCHours() !== 0 ||
    d.getUTCMinutes() !== 0 ||
    d.getUTCSeconds() !== 0 ||
    d.getUTCMilliseconds() !== 0
  );
}

/** Canonicalize a JS Date to ISO date or datetime string (does not store Date). */
export function dateToIsoString(d: Date): string {
  if (!hasTimeComponent(d)) {
    return formatDateOnly(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  return formatDateTimeUtc(d);
}

/**
 * Convert date-like cell values to ISO 8601 strings.
 * - Already-canonical ISO strings pass through.
 * - Excel serial numbers (reasonable range) → ISO.
 * - Other values returned unchanged after empty normalize.
 */
export function normalizeDate(value: CellValue): CellValue {
  const emptied = normalizeEmpty(value);
  if (emptied === null || typeof emptied === 'boolean') {
    return emptied;
  }

  if (typeof emptied === 'number') {
    // Excel serials are typically 1..60000+; avoid coercing ordinary numbers.
    if (emptied > 20000 && emptied < 60000) {
      return dateToIsoString(excelSerialToDate(emptied));
    }
    return emptied;
  }

  const trimmed = emptied.trim();
  if (DATE_ONLY.test(trimmed)) {
    return trimmed;
  }
  if (DATETIME_Z.test(trimmed)) {
    return trimmed.includes('.') ? trimmed : trimmed.replace(/Z$/, '.000Z');
  }
  if (DATETIME_OFFSET.test(trimmed)) {
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return dateToIsoString(new Date(parsed));
    }
  }
  const slash = DATE_SLASH.exec(trimmed);
  if (slash) {
    const year = Number(slash[1]);
    const month = Number(slash[2]);
    const day = Number(slash[3]);
    return formatDateOnly(year, month, day);
  }

  return emptied;
}

/**
 * Convert a raw parser Date (or Excel serial) at the parse boundary so
 * `CellValue` never contains a mutable `Date`.
 */
export function canonicalizeParsedDate(value: Date | number): string {
  if (typeof value === 'number') {
    return dateToIsoString(excelSerialToDate(value));
  }
  return dateToIsoString(value);
}
