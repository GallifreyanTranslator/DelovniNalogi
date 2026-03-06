import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * One WorkRecord = one person (voznik OR sodelavec) for one job entry.
 * When a job has voznik + 2 coworkers, 3 separate records are created,
 * each with their own hours. The vehicle is linked via voziloValue.
 * tipOsebe = 'voznik' means this record also "owns" the vehicle hours.
 */
export interface WorkRecord {
  id: number;
  datum: string;
  cas: string;
  // Job info
  obcina: string;
  operacija: string;
  vozilo: string;
  voziloValue: string;
  // Person info
  oseba: string;          // display name
  osebaValue: string;     // code / sifra
  tipOsebe: 'voznik' | 'sodelavec';
  ure: number;
  // Group link – all records from the same wizard submission share this
  skupinaId: number;
}

const RECORDS_KEY = 'work_records_v2';
const CUSTOM_VEHICLES_KEY = 'custom_vehicles_v1';
const CUSTOM_WORKERS_KEY = 'custom_workers_v1';

export async function loadRecords(): Promise<WorkRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WorkRecord[];
  } catch {
    return [];
  }
}

export async function saveRecords(records: WorkRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('saveRecords error:', err);
  }
}

export async function loadCustomVehicles(): Promise<{ label: string; value: string }[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_VEHICLES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveCustomVehicles(items: { label: string; value: string }[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CUSTOM_VEHICLES_KEY, JSON.stringify(items));
  } catch {}
}

export async function loadCustomWorkers(): Promise<{ label: string; value: string }[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_WORKERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveCustomWorkers(items: { label: string; value: string }[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CUSTOM_WORKERS_KEY, JSON.stringify(items));
  } catch {}
}
