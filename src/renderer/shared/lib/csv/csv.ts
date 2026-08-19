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
 * Whether the whole field is a finite number, and so safe to leave unguarded.
 *
 * `Number` is deliberately the judge instead of a hand-rolled regex: it accepts
 * exactly what a spreadsheet reads back as a number (`-1.5`, `+7`, `1e3`, `.5`)
 * and rejects everything else (`+7 days`, `-- comment`, `=1+1` are all `NaN`).
 * `Number('')` is `0`, hence the emptiness check; `Number('1e999')` is
 * `Infinity`, which `Number.isFinite` rejects, so overflowing literals keep the
 * guard.
 */
const isNumericField = (value: string): boolean => {
  return value.trim() !== '' && Number.isFinite(Number(value));
};

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
 *
 * Plain numbers are exempt from that prefix. A negative amount shares its
 * leading `-` with the formula prefix, and quoting it would ship `'-1.5` as
 * text \u2014 the column then stops summing in Excel and Sheets. Numeric
 * exports are real (`rawPayoutCsvColumns` writes signed indexer amounts), and a
 * field that parses whole as a finite number carries nothing to execute.
 *
 * The numeric exemption skips only the anti-formula prefix, never RFC 4180
 * quoting: `Number` ignores surrounding whitespace, so `'1\n'` is numeric yet
 * still has to be quoted to avoid breaking the row apart.
 */
const escapeCsvField = (value: string): string => {
  const guarded = !isNumericField(value) && FORMULA_PREFIX.test(value) ? `'${value}` : value;

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
