type CellValue = string | number | boolean | null | undefined;

export interface CsvColumn<Row> {
  key: keyof Row & string;
  header: string;
  format?: (value: Row[keyof Row]) => string;
}

export interface CsvInput<Row> {
  columns: CsvColumn<Row>[];
  rows: Row[];
}

const CRLF = '\r\n';
const BOM = '﻿';

export function toCsv<Row>({ columns, rows }: CsvInput<Row>): string {
  const headerLine = columns.map((c) => escapeField(c.header)).join(',');
  const body = rows.map((row) =>
    columns
      .map((c) => {
        const raw = row[c.key];
        if (raw === null || raw === undefined) return '';
        const stringified = c.format
          ? c.format(raw)
          : typeof raw === 'string'
            ? raw
            : String(raw as CellValue);
        return escapeField(stringified);
      })
      .join(','),
  );
  return BOM + [headerLine, ...body].join(CRLF) + CRLF;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeField(value: string): string {
  if (/^[=+\-@\t\r|]/.test(value)) {
    const escaped = value.replace(/"/g, '""');
    return `"=""${escaped}"""`;
  }
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
