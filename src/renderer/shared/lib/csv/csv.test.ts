import { type CsvColumn, buildCsv } from './csv';

type Row = { name: string; value: string };

const columns: CsvColumn<Row>[] = [
  { header: 'Name', cell: (row) => row.name },
  { header: 'Value', cell: (row) => row.value },
];

describe('shared/lib/csv', () => {
  it('should build header and rows joined with CRLF', () => {
    const result = buildCsv(columns, [
      { name: 'alice', value: '1' },
      { name: 'bob', value: '2' },
    ]);

    expect(result).toBe('Name,Value\r\nalice,1\r\nbob,2');
  });

  it('should produce only the header row for empty rows', () => {
    const result = buildCsv(columns, []);

    expect(result).toBe('Name,Value');
  });

  it('should quote fields containing commas', () => {
    const result = buildCsv(columns, [{ name: 'a,b', value: '1' }]);

    expect(result).toBe('Name,Value\r\n"a,b",1');
  });

  it.each(['=1+1', '+1', '-1', '@SUM(A1)', '\tx'])('should neutralise the formula prefix in %j', (name) => {
    const result = buildCsv(columns, [{ name, value: '1' }]);

    expect(result.split('\r\n')[1]).toMatch(/^'/);
  });

  it('should quote a neutralised formula that also needs RFC 4180 quoting', () => {
    const result = buildCsv(columns, [{ name: '=HYPERLINK("http://x","go")', value: '1' }]);

    expect(result).toBe(`Name,Value\r\n"'=HYPERLINK(""http://x"",""go"")",1`);
  });

  it('should leave a value that only contains a formula character alone', () => {
    const result = buildCsv(columns, [{ name: 'a=b', value: '1-2' }]);

    expect(result).toBe('Name,Value\r\na=b,1-2');
  });

  it('should escape quotes by doubling and wrap the field in quotes', () => {
    const result = buildCsv(columns, [{ name: 'say "hi"', value: '1' }]);

    expect(result).toBe('Name,Value\r\n"say ""hi""",1');
  });

  it('should quote fields containing newlines', () => {
    const result = buildCsv(columns, [{ name: 'line1\nline2', value: 'a\r\nb' }]);

    expect(result).toBe('Name,Value\r\n"line1\nline2","a\r\nb"');
  });

  it('should quote headers containing special characters', () => {
    const specialColumns: CsvColumn<Row>[] = [
      { header: 'Name, full', cell: (row) => row.name },
      { header: 'Value', cell: (row) => row.value },
    ];

    const result = buildCsv(specialColumns, [{ name: 'alice', value: '1' }]);

    expect(result).toBe('"Name, full",Value\r\nalice,1');
  });

  it('should pass unicode through untouched', () => {
    const result = buildCsv(columns, [{ name: 'Алиса 🚀', value: '¥1 000' }]);

    expect(result).toBe('Name,Value\r\nАлиса 🚀,¥1 000');
  });

  it('should keep empty fields empty', () => {
    const result = buildCsv(columns, [{ name: '', value: '' }]);

    expect(result).toBe('Name,Value\r\n,');
  });
});
