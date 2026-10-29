export type SupraSpaceMarkdownTable = {
  header: string[];
  rows: string[][];
  endIndex: number;
};

function splitTableCells(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return null;

  const content = trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '');

  const cells: string[] = [];
  let cell = '';
  let escaped = false;
  for (const character of content) {
    if (escaped) {
      cell += character;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === '|') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += character;
    }
  }
  if (escaped) cell += '\\';
  cells.push(cell.trim());
  return cells;
}

type TableStyleEnvelope = {
  opening: string;
  closing: string;
};

const TABLE_STYLE_OPENING_RE = /^(?:(?:\{(?:color|highlight):#[0-9a-f]{3,8}\}|\{font:[a-z-]+\}|\{size:\d{1,3}\}))/i;
const TABLE_STYLE_CLOSING_RE = /(?:(?:\{\/(?:color|highlight|font|size)\}))$/i;

function unwrapTableStyleOpening(line: string): { line: string; envelope: TableStyleEnvelope | null } {
  let remainder = line.trim();
  let opening = '';
  const closings: string[] = [];
  let match: RegExpMatchArray | null;

  while ((match = remainder.match(TABLE_STYLE_OPENING_RE))) {
    const token = match[0];
    const kind = token.match(/^\{(?:color|highlight|font|size):/i)?.[0]
      .replace(/^\{/, '')
      .replace(/:$/, '');
    if (!kind) break;
    opening += token;
    closings.unshift(`{/${kind}}`);
    remainder = remainder.slice(token.length).trimStart();
  }

  return { line: remainder, envelope: opening ? { opening, closing: closings.join('') } : null };
}

function unwrapTableStyleClosing(line: string, envelope: TableStyleEnvelope | null): string {
  if (!envelope) return line;
  let remainder = line.trimEnd();
  let closing = '';
  let match: RegExpMatchArray | null;
  while ((match = remainder.match(TABLE_STYLE_CLOSING_RE))) {
    closing = `${match[0]}${closing}`;
    remainder = remainder.slice(0, -match[0].length).trimEnd();
  }
  return closing === envelope.closing ? remainder : line;
}

function applyTableStyleEnvelope(cells: string[], envelope: TableStyleEnvelope | null): string[] {
  if (!envelope) return cells;
  return cells.map(cell => cell ? `${envelope.opening}${cell}${envelope.closing}` : cell);
}

function isDelimiterRow(cells: string[], columnCount: number): boolean {
  return cells.length === columnCount
    && cells.every(cell => /^:?-{3,}:?$/.test(cell.trim()));
}

export function parseSupraSpaceMarkdownTable(
  lines: string[],
  startIndex: number,
): SupraSpaceMarkdownTable | null {
  const opening = unwrapTableStyleOpening(lines[startIndex] || '');
  const header = splitTableCells(opening.line);
  const delimiter = splitTableCells(lines[startIndex + 1] || '');
  if (!header?.length || !delimiter || !isDelimiterRow(delimiter, header.length)) return null;

  const rows: string[][] = [];
  let endIndex = startIndex + 2;
  while (endIndex < lines.length) {
    const cells = splitTableCells(unwrapTableStyleClosing(lines[endIndex], opening.envelope));
    if (!cells || cells.length !== header.length) break;
    rows.push(applyTableStyleEnvelope(cells, opening.envelope));
    endIndex += 1;
  }
  return { header: applyTableStyleEnvelope(header, opening.envelope), rows, endIndex };
}

function escapeTableCell(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

export function serializeSupraSpaceEditorTable(
  table: HTMLTableElement,
  serializeCell: (cell: HTMLTableCellElement) => string,
): string {
  const rows = Array.from(table.rows)
    .map(row => Array.from(row.cells).map(cell => escapeTableCell(serializeCell(cell).trim())))
    .filter(row => row.length > 0);
  if (!rows.length) return '';

  const columnCount = Math.max(...rows.map(row => row.length));
  const normalizedRows = rows.map(row => [
    ...row,
    ...Array(Math.max(0, columnCount - row.length)).fill(''),
  ]);
  const toRow = (cells: string[]) => `| ${cells.join(' | ')} |`;
  return [
    toRow(normalizedRows[0]),
    toRow(Array(columnCount).fill('---')),
    ...normalizedRows.slice(1).map(toRow),
  ].join('\n');
}

/** Remove only recognized table syntax for the visible-content comparison. */
export function supraSpaceTablesToComparableText(value: string): string {
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  const output: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const table = parseSupraSpaceMarkdownTable(lines, index);
    if (!table) {
      output.push(lines[index]);
      continue;
    }
    output.push(...[table.header, ...table.rows].map(row => row.join(' ').replace(/<br\s*\/?\s*>/gi, '\n')));
    index = table.endIndex - 1;
  }
  return output.join('\n');
}

export function createSupraSpaceEditorTableHtml(rows = 3, columns = 3): string {
  const header = Array.from({ length: columns }, (_, index) => `<th>Header ${index + 1}</th>`).join('');
  const body = Array.from({ length: Math.max(1, rows - 1) }, () => (
    `<tr>${Array.from({ length: columns }, (_, index) => `<td>Cell ${index + 1}</td>`).join('')}</tr>`
  )).join('');
  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table><div><br></div>`;
}

export function isSupraSpaceSpreadsheetFile(file: Pick<File, 'name' | 'type'>): boolean {
  return /\.(?:xlsx|xls|csv)$/i.test(file.name)
    || /(?:spreadsheet|excel|csv)/i.test(file.type);
}

function escapeEditorHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function spreadsheetFileToSupraSpaceEditorHtml(file: File): Promise<string> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellText: true, cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error('The spreadsheet has no sheets.');
  const data = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  }).slice(0, 100).map(row => row.slice(0, 30));
  if (!data.length || !data.some(row => row.some(cell => String(cell).trim()))) {
    throw new Error('The first sheet is empty.');
  }
  const columns = Math.max(...data.map(row => row.length));
  const normalized = data.map(row => [...row, ...Array(Math.max(0, columns - row.length)).fill('')]);
  const renderRow = (cells: unknown[], tag: 'th' | 'td') => `<tr>${cells.map(cell => `<${tag}>${escapeEditorHtml(cell).replace(/\r?\n/g, '<br>')}</${tag}>`).join('')}</tr>`;
  return `<table><thead>${renderRow(normalized[0], 'th')}</thead><tbody>${normalized.slice(1).map(row => renderRow(row, 'td')).join('')}</tbody></table><div><br></div>`;
}
