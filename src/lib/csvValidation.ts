// CSV sanity check for Togo Insight drive-test exports.
// Pure (no DOM) so it runs in the browser before upload — and could be reused
// server-side. Ported from the standalone CsvSanityChecker.

export const EXPECTED_HEADER =
  "No,CallNo,Result,Reason,Primary RCA,RTU Name,Start Time,End Time,Service Type,Call Type,Log File Name,AutoCall Scenario Name,Dialed Number,MIN Number,Call_Start_Lon,Call Start Lat,Call End Lon,Call End Lat,Idle,Start,End,Middlle,Traffic Time,Network,Voice MOS Avg,Voice MOS 1st Value,Voice MOS 2nd Value,Voice MOS 3rd Value,Voice MOS 4th Value,Voice MOS 5th Value,HTTP Call Type,URL Address 1,URL Address 2,URL Address 3,URL Address 4,URL Address 5,URL Address 6,URL Address 7,URL Address 8,URL Address 9,URL Address 10,URL Address Last,URL Address Time 1,URL Address Time 2,URL Address Time 3,URL Address Time 4,URL Address Time 5,URL Address Time 6,URL Address Time 7,URL Address Time 8,URL Address Time 9,URL Address Time 10,URL Address Time Last,Total URL Address,Web Page Loading Time[sec],SMS Send Begin,SMS Send Message,SMS Receive Begin,SMS Receive End ,SMS Receive Message,Support of SMS,Data Transfer Time,[Down] Data Transfer Time,[Up] Data Transfer Time,FTP Connect Time,Connect Time,File Size[Up],File Size[Down],[Down] APP Throughput [Mbps],[Up] APP Throughput [Mbps],[Down] APP Throughput [Min],[Down] APP Throughput [Max],[Up] APP Throughput [Min],[Up] APP Throughput [Max],(WCDMA)Active DominantPSC(3Sec),(WCDMA)Active DominantEc/Io(3Sec),(WCDMA)Active DominantRSCP(3Sec),(WCDMA)Tx Power,(WCDMA)HS-DSCH Throughput (Served),(WCDMA)E-DPCH Throughput,Serving Cell RSRP,Serving Cell RSRQ,Serving PCI,PUSCH Tx Power,Serving Cell EARFCN,LTE Serving Band,PDSCH PHY Throughput,PUSCH PHY Throughput,Dominant BCCH CH No,Rx Level Sub,Rx Quality Sub,SmartPhone Operator,MNC,MCC,Phone Model,Phone OS Ver,Device ID,Service Provider Name,LTE Tech Rate [%],WCDMA Tech Rate [%],GSM Tech Rate [%],Measurement type,City Road,Point Number,Comments,Usage,Stratum,Area,Address,INSEE,Voice Service,Idle Time,Setup Time [sec],IMSI";

const MAX_ERRORS = 10;

interface Rule {
  mandatory?: boolean;
  allowed?: string[];
}

const RULES: Record<string, Rule> = {
  "City Road": { mandatory: true },
  "Point Number": {
    mandatory: true,
    allowed: [
      "STATIQUE",
      "POINT1",
      "POINT2",
      "POINT3",
      "POINT4",
      "POINT5",
      "POINT6",
      "POINT7",
      "POINT8",
      "POINT9",
      "POINT10",
      "POINT11",
      "POINT12",
      "MOBILITE",
    ],
  },
  "Service Provider Name": {
    mandatory: true,
    allowed: ["Togo Telecom", "Moov Togo"],
  },
};

export interface CsvHeaderError {
  expectedCount: number;
  actualCount: number;
  /** 0-based index of first differing column, or -1 if they only differ in length. */
  firstDiffIndex: number;
  expectedCol?: string;
  actualCol?: string;
}

export interface CsvColumnError {
  column: string;
  /** Affected 1-based line numbers (last entry may be "…" when truncated). */
  lines: string[];
  mandatory?: boolean;
  allowed?: string[];
}

export interface CsvValidationResult {
  valid: boolean;
  emptyFile: boolean;
  headerError?: CsvHeaderError;
  columnErrors: CsvColumnError[];
}

/** CSV line parser that respects quoted fields containing commas. */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function validateCsvContent(content: string): CsvValidationResult {
  // Strip UTF-8 BOM if present
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

  const lines = content.split(/\r?\n/);
  const onlyBlank = lines.every((l) => l.trim() === "");
  if (lines.length === 0 || onlyBlank) {
    return { valid: false, emptyFile: true, columnErrors: [] };
  }

  // Header must match exactly
  const actualHeader = lines[0];
  if (actualHeader !== EXPECTED_HEADER) {
    const exp = EXPECTED_HEADER.split(",");
    const act = actualHeader.split(",");
    let firstDiff = -1;
    const n = Math.max(exp.length, act.length);
    for (let i = 0; i < n; i++) {
      if (exp[i] !== act[i]) {
        firstDiff = i;
        break;
      }
    }
    return {
      valid: false,
      emptyFile: false,
      columnErrors: [],
      headerError: {
        expectedCount: exp.length,
        actualCount: act.length,
        firstDiffIndex: firstDiff,
        expectedCol: firstDiff >= 0 ? exp[firstDiff] : undefined,
        actualCol: firstDiff >= 0 ? act[firstDiff] : undefined,
      },
    };
  }

  // Header OK → validate data rows
  const headerIndex = new Map<string, number>();
  EXPECTED_HEADER.split(",").forEach((h, i) => headerIndex.set(h, i));

  const errors = new Map<string, string[]>();
  const addError = (col: string, lineNum: number) => {
    let arr = errors.get(col);
    if (!arr) {
      arr = [];
      errors.set(col, arr);
    }
    if (arr.length < MAX_ERRORS) arr.push(String(lineNum));
    else if (arr.length === MAX_ERRORS) arr.push("…");
  };

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue; // skip empty lines
    const cells = parseCsvLine(raw);
    for (const [col, rule] of Object.entries(RULES)) {
      const idx = headerIndex.get(col);
      if (idx === undefined) continue;
      const value = cells[idx] ?? "";
      if (rule.mandatory && value === "") {
        addError(col, i + 1);
      } else if (rule.allowed && !rule.allowed.includes(value)) {
        addError(col, i + 1);
      }
    }
  }

  const columnErrors: CsvColumnError[] = Array.from(errors.entries()).map(([column, lns]) => ({
    column,
    lines: lns,
    mandatory: RULES[column]?.mandatory,
    allowed: RULES[column]?.allowed,
  }));

  return { valid: columnErrors.length === 0, emptyFile: false, columnErrors };
}
