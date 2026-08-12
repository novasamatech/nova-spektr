import { type Address, type ID, type WalletType } from '@/shared/core';
import { type ContactTag } from '@/shared/core/types/contact';

export type AccountSource = 'wallet' | 'local-contact' | 'backend-contact';

export type PresetFilterCriteria = {
  sources: AccountSource[];
  entityNames: string[];
  categoryNames: string[];
  tags: ContactTag[];
  /** Keyed by chainId — chain names may be renamed on the backend. */
  chainIds: string[];
  contactTypeNames: string[];
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
  chainIds: [],
  contactTypeNames: [],
};

/**
 * One row per `accountId` even when the address is known to multiple sources.
 * Per-source metadata fields are only populated when `sources` contains the
 * matching tag — narrow on `sources.includes(...)` before reading them.
 */
export type AccountEntry = {
  id: string;
  name: string;
  address: Address;
  accountId: string;
  /** Deduplicated names from every source (original casing), used for search. */
  aliases: string[];
  sources: AccountSource[];

  walletId?: ID;
  walletName?: string;
  walletType?: WalletType;

  entityNames?: string[];
  categoryName?: string | null;
  tags?: ContactTag[];
  chainId?: string | null;
  chainName?: string | null;
  contactTypeName?: string | null;
};
