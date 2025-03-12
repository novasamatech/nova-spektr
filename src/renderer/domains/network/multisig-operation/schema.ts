import { type z } from 'zod';

import { multisigPallet } from '@/shared/pallet/multisig';
import { pjsSchema } from '@/shared/polkadotjs-schemas';

export type MultisigEvent = z.infer<typeof multisigEvent>;
export const multisigEvent = pjsSchema.tupleMap(
  ['account', pjsSchema.accountId],
  ['timepoint', multisigPallet.schema.multisigTimepoint],
  ['multisig', pjsSchema.accountId],
  ['callHash', pjsSchema.hex],
);
