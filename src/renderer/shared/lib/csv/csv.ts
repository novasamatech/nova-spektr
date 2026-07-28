export type CsvColumn<T> = {
  header: string;
  cell: (row: T) => string;
};

/**
 * Leading characters a spreadsheet reads as the start of a formula. RFC 4180
 * quoting does not neutralise them — Excel, LibreOffice and Sheets all evaluate
 * `"=HYPERLINK(...)"` on open.
 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Marks the file as UTF-8 for Excel, which otherwise assumes the ANSI code
 * page.
 */
const UTF8_BOM = '\uFEFF';

/**
 * Escapes a single CSV field according to RFC 4180: fields containing commas,
 * double quotes or line breaks are wrapped in double quotes, with inner quotes
 * doubled.
 *
 * A value that would otherwise open as a formula is additionally prefixed with
 * a single quote. Cell content here is user- and chain-supplied (wallet names,
 * on-chain identities, call metadata), so the export must not hand the
 * spreadsheet something to execute.
 */
const escapeCsvField = (value: string): string => {
  const guarded = FORMULA_PREFIX.test(value) ? `'${value}` : value;

  if (/[",\r\n]/.test(guarded)) {
    return `"${guarded.replaceAll('"', '""')}"`;
  }

  return guarded;
};

/**
 * Builds an RFC 4180 CSV string (CRLF line endings) with a header row followed
 * by one row per item.
 */
export const buildCsv = <T>(columns: CsvColumn<T>[], rows: T[]): string => {
  const lines = [columns.map((column) => escapeCsvField(column.header)).join(',')];

  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsvField(column.cell(row))).join(','));
  }

  return lines.join('\r\n');
};

/**
 * Triggers a file download in the renderer via Blob + object URL + anchor click
 * — the same mechanism as `downloadFiles` in `shared/lib/utils`, which
 * Electron's session download handling picks up.
 */
export const downloadCsv = (filename: string, content: string): void => {
  // Excel on Windows reads a BOM-less file with the ANSI code page, which turns
  // Cyrillic wallet names and non-Latin symbols into mojibake. `buildCsv` stays
  // pure; the marker belongs to the file, not to the content.
  const blob = new Blob([UTF8_BOM, content], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 0);
};
