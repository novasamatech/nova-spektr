export type CsvColumn<T> = {
  header: string;
  cell: (row: T) => string;
};

/**
 * Escapes a single CSV field according to RFC 4180: fields containing commas,
 * double quotes or line breaks are wrapped in double quotes, with inner quotes
 * doubled.
 */
const escapeCsvField = (value: string): string => {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
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
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
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
