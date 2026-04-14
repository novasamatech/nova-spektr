import { type Address, type ID, type WalletType } from '@/shared/core';
import { type ContactTag } from '@/shared/core/types/contact';

export type PresetFilterCriteria = {
  sources: ('wallet' | 'local-contact' | 'backend-contact')[];
  entityNames: string[];
  categoryNames: string[];
  tags: ContactTag[];
};

export type PresetType = 'filter' | 'custom';

export type AccountPreset = {
  id: string;
  name: string;
  type: PresetType;
  filters: PresetFilterCriteria;
  selectedIds: string[]; // used when type === 'custom'
};

export const EMPTY_FILTERS: PresetFilterCriteria = {
  sources: [],
  entityNames: [],
  categoryNames: [],
  tags: [],
};

type BaseEntry = {
  id: string;
  name: string;
  address: Address;
  accountId: string;
};

/** Wallet-backed entry: the user owns signatory keys via a wallet. */
export type WalletAccountEntry = BaseEntry & {
  source: 'wallet';
  walletId: ID;
  walletName?: string;
  walletType?: WalletType;
};

/** Local (user-managed) contact — no metadata fields. */
export type LocalContactAccountEntry = BaseEntry & {
  source: 'local-contact';
};

/** Backend-synced contact — carries entity/category/tag metadata. */
export type BackendContactAccountEntry = BaseEntry & {
  source: 'backend-contact';
  entityNames: string[];
  categoryName: string | null;
  tags: ContactTag[];
};

/**
 * Discriminated union over `source`. Field presence is dictated by the
 * discriminant — narrow with `entry.source === 'backend-contact'` to access the
 * contact metadata fields safely.
 */
export type AccountEntry = WalletAccountEntry | LocalContactAccountEntry | BackendContactAccountEntry;
