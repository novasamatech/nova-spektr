import { type ReactNode } from 'react';

import { createSlot } from '@/shared/di';
import { type AnyAccount } from '@/domains/network';

// Lives in `lib/` so the drafts barrel can re-export the slot without pulling
// in `DraftRow`'s transitive UI chain — that import edge would otherwise be
// part of the drafts → accounts-structure → wallet-details →
// flexible-change-signatories → drafts cycle.
export const draftAccountsOverviewSlot = createSlot<{
  walletAccounts: AnyAccount[];
  initialChainId: string;
  trigger: ReactNode;
  exclusive?: boolean;
}>();
