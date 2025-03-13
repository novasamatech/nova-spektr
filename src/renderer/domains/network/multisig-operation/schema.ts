import { type z } from 'zod';

import { multisigPallet } from '@/shared/pallet/multisig';
import { pjsSchema } from '@/shared/polkadotjs-schemas';

export type MultisigEvent = z.infer<typeof multisigEvent>;
export const multisigEvent = pjsSchema.tupleMap(
  ['accountId', pjsSchema.accountId],
  ['timepoint', multisigPallet.schema.multisigTimepoint],
  ['multisigAccountId', pjsSchema.accountId],
  ['callHash', pjsSchema.hex],
);
