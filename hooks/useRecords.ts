import { useContext } from 'react';
import { RecordsContext } from '@/contexts/RecordsContext';

export function useRecords() {
  const context = useContext(RecordsContext);
  if (!context) throw new Error('useRecords must be used within RecordsProvider');
  return context;
}
