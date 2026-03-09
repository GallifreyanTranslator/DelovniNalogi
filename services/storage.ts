import * as FileSystem from 'expo-file-system';

/**
 * One WorkRecord = one person (voznik OR sodelavec) for one job entry.
 */
export interface WorkRecord {
  id: number;
  datum: string;
  cas: string;
  obcina: string;
  operacija: string;
  vozilo: string;
  voziloValue: string;
  oseba: string;
  osebaValue: string;
  tipOsebe: 'voznik' | 'sodelavec';
  ure: number;
  skupinaId: number;
}

// ─── File-based storage (no native bridge required) ───────────────────────────
// Using expo-file-system (pure JS API) instead of AsyncStorage to avoid
// the native bridge initialization deadlock that occurs on some Android devices.

const DIR = FileSystem.documentDirectory ?? '';
const RECORDS_FILE = DIR + 'work_records_v2.json';
const VEHICLES_FILE = DIR + 'custom_vehicles_v1.json';
const WORKERS_FILE = DIR + 'custom_workers_v1.json';

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return fallback;
    const raw = await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.UTF8 });
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(path: string, data: unknown): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(path, JSON.stringify(data), {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (err) {
    console.error('writeJson error:', path, err);
  }
}

export async function loadRecords(): Promise<WorkRecord[]> {
  return readJson<WorkRecord[]>(RECORDS_FILE, []);
}

export async function saveRecords(records: WorkRecord[]): Promise<void> {
  await writeJson(RECORDS_FILE, records);
}

export async function loadCustomVehicles(): Promise<{ label: string; value: string }[]> {
  return readJson(VEHICLES_FILE, []);
}

export async function saveCustomVehicles(items: { label: string; value: string }[]): Promise<void> {
  await writeJson(VEHICLES_FILE, items);
}

export async function loadCustomWorkers(): Promise<{ label: string; value: string }[]> {
  return readJson(WORKERS_FILE, []);
}

export async function saveCustomWorkers(items: { label: string; value: string }[]): Promise<void> {
  await writeJson(WORKERS_FILE, items);
}
