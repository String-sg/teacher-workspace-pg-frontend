import { describe, expect, it } from 'vitest';

import { toCsv } from './exportCsv';

function csvCell(value: string): string {
  const result = toCsv({ columns: [{ key: 'v', header: 'H' }], rows: [{ v: value }] });
  const lines = result.split('\r\n');
  return lines[1];
}

describe('escapeField formula injection protection', () => {
  it('neutralizes cells starting with = sign', () => {
    const cell = csvCell('=SUM(A1:A10)');
    expect(cell).toBe('"=""=SUM(A1:A10)"""');
  });

  it('neutralizes cells starting with + sign', () => {
    const cell = csvCell('+44 1234 5678');
    expect(cell).toBe('"=""+44 1234 5678"""');
  });

  it('neutralizes cells starting with - sign', () => {
    const cell = csvCell('-1+1');
    expect(cell).toBe('"=""-1+1"""');
  });

  it('neutralizes cells starting with @ sign', () => {
    const cell = csvCell('@SUM');
    expect(cell).toBe('"=""@SUM"""');
  });

  it('neutralizes cells starting with | (pipe) character', () => {
    const cell = csvCell("|cmd|'/C calc.exe'!A1");
    expect(cell).toBe(`"=""|cmd|'/C calc.exe'!A1"""`);
  });

  it('neutralizes DDE attack vector', () => {
    const cell = csvCell("=cmd|'/C calc.exe'!A1");
    expect(cell).toBe(`"=""=cmd|'/C calc.exe'!A1"""`);
  });

  it('leaves normal text unchanged', () => {
    expect(csvCell('Alice Tan')).toBe('Alice Tan');
    expect(csvCell('3A')).toBe('3A');
  });

  it('handles values with commas correctly', () => {
    const cell = csvCell('Tan, Alice');
    expect(cell).toBe('"Tan, Alice"');
  });

  it('handles values with quotes correctly', () => {
    const cell = csvCell('She said "hello"');
    expect(cell).toBe('"She said ""hello"""');
  });

  it('handles dangerous prefix combined with commas', () => {
    const cell = csvCell('=formula,with,commas');
    expect(cell).toBe('"=""=formula,with,commas"""');
  });

  it('handles dangerous prefix with embedded quotes', () => {
    const cell = csvCell('=say "hi"');
    expect(cell).toBe('"=""=say ""hi"""""');
  });
});
