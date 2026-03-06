import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { WorkRecord } from './storage';

// ─── XLSX generation via raw Open XML + base64 zip ───────────────────────────
// We implement a minimal ZIP builder so we don't need a native dependency.

// --- Minimal CRC32 ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function strToU8(str: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return new Uint8Array(bytes);
}

function u8ToBase64(data: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  while (i < data.length) {
    const a = data[i++];
    const b = i < data.length ? data[i++] : 0;
    const c = i < data.length ? data[i++] : 0;
    result += chars[a >> 2];
    result += chars[((a & 3) << 4) | (b >> 4)];
    result += i - 2 < data.length ? chars[((b & 15) << 2) | (c >> 6)] : '=';
    result += i - 1 < data.length ? chars[c & 63] : '=';
  }
  return result;
}

function le16(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff];
}
function le32(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
}

function concatU8(...arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
  crc: number;
  offset: number;
}

function buildZip(files: { name: string; content: string }[]): Uint8Array {
  const entries: ZipEntry[] = [];
  const localParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const data = strToU8(file.content);
    const crc = crc32(data);
    const nameBytes = strToU8(file.name);
    const nameLen = nameBytes.length;

    // Local file header
    const localHeader = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, // signature
      0x14, 0x00,             // version needed
      0x00, 0x00,             // flags
      0x00, 0x00,             // compression (stored)
      0x00, 0x00,             // mod time
      0x00, 0x00,             // mod date
      ...le32(crc),
      ...le32(data.length),
      ...le32(data.length),
      ...le16(nameLen),
      0x00, 0x00,             // extra len
      ...Array.from(nameBytes),
    ]);

    entries.push({ name: file.name, data, crc, offset });
    localParts.push(localHeader, data);
    offset += localHeader.length + data.length;
  }

  // Central directory
  const centralParts: Uint8Array[] = [];
  for (const entry of entries) {
    const nameBytes = strToU8(entry.name);
    const cd = new Uint8Array([
      0x50, 0x4b, 0x01, 0x02, // signature
      0x14, 0x00,             // version made by
      0x14, 0x00,             // version needed
      0x00, 0x00,             // flags
      0x00, 0x00,             // compression
      0x00, 0x00,             // mod time
      0x00, 0x00,             // mod date
      ...le32(entry.crc),
      ...le32(entry.data.length),
      ...le32(entry.data.length),
      ...le16(nameBytes.length),
      0x00, 0x00,             // extra len
      0x00, 0x00,             // comment len
      0x00, 0x00,             // disk start
      0x00, 0x00,             // int attribs
      0x00, 0x00, 0x00, 0x00, // ext attribs
      ...le32(entry.offset),
      ...Array.from(nameBytes),
    ]);
    centralParts.push(cd);
  }

  const centralDir = concatU8(...centralParts);
  const localData = concatU8(...localParts);
  const cdOffset = localData.length;
  const cdSize = centralDir.length;

  const eocd = new Uint8Array([
    0x50, 0x4b, 0x05, 0x06, // signature
    0x00, 0x00,             // disk number
    0x00, 0x00,             // disk with cd
    ...le16(entries.length),
    ...le16(entries.length),
    ...le32(cdSize),
    ...le32(cdOffset),
    0x00, 0x00,             // comment len
  ]);

  return concatU8(localData, centralDir, eocd);
}

// ─── XML helpers ─────────────────────────────────────────────────────────────

function escXml(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colLetter(n: number): string {
  let s = '';
  n++;
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

function buildSheetXml(rows: (string | number)[][]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  xml += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"`;
  xml += ` xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`;
  xml += `<sheetData>`;

  rows.forEach((row, ri) => {
    xml += `<row r="${ri + 1}">`;
    row.forEach((cell, ci) => {
      const ref = `${colLetter(ci)}${ri + 1}`;
      if (typeof cell === 'number') {
        xml += `<c r="${ref}"><v>${cell}</v></c>`;
      } else {
        xml += `<c r="${ref}" t="inlineStr"><is><t>${escXml(cell)}</t></is></c>`;
      }
    });
    xml += `</row>`;
  });

  xml += `</sheetData></worksheet>`;
  return xml;
}

// ─── Data builders ────────────────────────────────────────────────────────────

/**
 * Sheet 1: Workers/coworkers – each unique (obcina|operacija|osebaValue) = one row,
 * ure summed. Both vozniki and sodelavci appear here.
 */
function buildWorkersData(records: WorkRecord[]): (string | number)[][] {
  const header: (string | number)[] = ['Občina', 'Operacija', 'Ime', 'Šifra', 'Tip', 'Ure', 'Datum'];
  const rows: (string | number)[][] = [header];

  const map = new Map<string, { row: (string | number)[]; ure: number }>();
  records.forEach(r => {
    const key = [r.obcina, r.operacija, r.osebaValue].join('|');
    if (!map.has(key)) {
      map.set(key, {
        row: [r.obcina, r.operacija, r.oseba, r.osebaValue, r.tipOsebe === 'voznik' ? 'Voznik' : 'Sodelavec', 0, r.datum],
        ure: 0,
      });
    }
    map.get(key)!.ure += r.ure;
  });

  map.forEach(({ row, ure }) => {
    row[5] = Math.round(ure * 10) / 10;
    rows.push(row);
  });

  return rows;
}

/**
 * Sheet 2: Vehicles – only voznik records (one record per vehicle job),
 * each unique (obcina|operacija|voziloValue) = one row, ure summed.
 */
function buildVehiclesData(records: WorkRecord[]): (string | number)[][] {
  const header: (string | number)[] = ['Občina', 'Operacija', 'Vozilo', 'Šifra Vozila', 'Ure', 'Datum'];
  const rows: (string | number)[][] = [header];

  const map = new Map<string, { row: (string | number)[]; ure: number }>();
  records
    .filter(r => r.tipOsebe === 'voznik')
    .forEach(r => {
      const key = [r.obcina, r.operacija, r.voziloValue].join('|');
      if (!map.has(key)) {
        map.set(key, {
          row: [r.obcina, r.operacija, r.vozilo, r.voziloValue, 0, r.datum],
          ure: 0,
        });
      }
      map.get(key)!.ure += r.ure;
    });

  map.forEach(({ row, ure }) => {
    row[4] = Math.round(ure * 10) / 10;
    rows.push(row);
  });

  return rows;
}

// ─── Public export functions ──────────────────────────────────────────────────

export async function exportWorkersXlsx(records: WorkRecord[]): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  const rows = buildWorkersData(records);
  const sheetXml = buildSheetXml(rows);

  const files = buildXlsxFiles([{ xml: sheetXml, name: 'Delavci' }]);
  const zip = buildZip(files);
  const b64 = u8ToBase64(zip);

  const fileUri = FileSystem.documentDirectory + `delavci_${date}.xlsx`;
  await FileSystem.writeAsStringAsync(fileUri, b64, { encoding: FileSystem.EncodingType.Base64 });

  const avail = await Sharing.isAvailableAsync();
  if (avail) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Izvozi delavce',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  }
}

export async function exportVehiclesXlsx(records: WorkRecord[]): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  const rows = buildVehiclesData(records);
  const sheetXml = buildSheetXml(rows);

  const files = buildXlsxFiles([{ xml: sheetXml, name: 'Vozila' }]);
  const zip = buildZip(files);
  const b64 = u8ToBase64(zip);

  const fileUri = FileSystem.documentDirectory + `vozila_${date}.xlsx`;
  await FileSystem.writeAsStringAsync(fileUri, b64, { encoding: FileSystem.EncodingType.Base64 });

  const avail = await Sharing.isAvailableAsync();
  if (avail) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Izvozi vozila',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  }
}

// ─── XLSX package builder ─────────────────────────────────────────────────────

function buildXlsxFiles(sheets: { xml: string; name: string }[]): { name: string; content: string }[] {
  const sheetFiles = sheets.map((s, i) => ({
    name: `xl/worksheets/sheet${i + 1}.xml`,
    content: s.xml,
  }));

  const sheetRels = sheets.map((_, i) =>
    `<Relationship Id="rId${i + 1}" ` +
    `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" ` +
    `Target="worksheets/sheet${i + 1}.xml"/>`
  ).join('');

  const sheetDefs = sheets.map((s, i) =>
    `<sheet name="${escXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
  ).join('');

  const contentTypes = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `<Default Extension="xml" ContentType="application/xml"/>`,
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`,
    ...sheets.map((_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ` +
      `ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    ),
    `</Types>`,
  ].join('');

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheetRels}
</Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheetDefs}</sheets>
</workbook>`;

  return [
    { name: '[Content_Types].xml', content: contentTypes },
    { name: '_rels/.rels', content: rootRels },
    { name: 'xl/workbook.xml', content: workbook },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRels },
    ...sheetFiles,
  ];
}
