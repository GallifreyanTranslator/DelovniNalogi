// Native (iOS/Android): real MMKV — synchronous, no async bridge, no deadlocks
import { MMKV } from 'react-native-mmkv';

const mmkv = new MMKV({ id: 'work-records-v1' });

export const storage = {
  getString: (key: string): string | undefined => mmkv.getString(key),
  set: (key: string, value: string): void => mmkv.set(key, value),
  delete: (key: string): void => mmkv.delete(key),
};
