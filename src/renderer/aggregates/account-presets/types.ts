import { type Address, type ID, type WalletType } from '@/shared/core';
import { type ContactField } from '@/shared/core/types/contact';

export type AccountSource = 'wallet' | 'local-contact' | 'backend-contact';

/**
 * A criterion over one admin-defined address-book field. Matching runs on the
 * stable backend ids (admins can rename fields/options without breaking saved
 * presets); `fieldName` and option `value`s are display snapshots used to
 * render a criterion whose field no longer exists in the address book.
 */
export type FieldCriterion = {
  fieldId: string;
  fieldName: string;
  options: { id: string; value: string }[];
};

export type PresetFilterCriteria = {
  sources: AccountSource[];
  /** Keyed by chainId — chain names may be renamed on the backend. */
  chainIds: string[];
  fields: FieldCriterion[];
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
  chainIds: [],
  fields: [],
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

  chainId?: string | null;
  fields?: ContactField[];
};
