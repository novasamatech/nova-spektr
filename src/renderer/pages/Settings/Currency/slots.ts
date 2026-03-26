import { createSlot } from '@/shared/di';

export const currencyModalSlot = createSlot<{ onClose: () => void }>({ name: 'settings/currency' });
