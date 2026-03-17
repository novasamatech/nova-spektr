import { createFeature } from '@/shared/feature';
import { currencyModalSlot } from '@/pages/Settings/Currency/slots';

import { CurrencyModal } from './ui/CurrencyModal';

export { CurrencyForm } from './CurrencyForm';

export const currencyFeature = createFeature({ name: 'settings/currency' });
currencyFeature.inject(currencyModalSlot, { render: CurrencyModal });
