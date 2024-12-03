import { type ObjectValues } from '@/shared/core';

export const Paths = {
  ROOT: '/',

  // Onboarding
  ONBOARDING: '/onboarding',

  // Assets
  ASSETS: '/assets',
  TRANSFER_ASSET: '/assets/transfer',
  RECEIVE_ASSET: '/assets/receive',

  // Navigation
  OPERATIONS: '/operations',
  NOTIFICATIONS: '/notifications',

  // Address book
  ADDRESS_BOOK: '/address-book',
  CREATE_CONTACT: '/address-book/create-contact',
  EDIT_CONTACT: '/address-book/edit-contact',

  // Settings
  SETTINGS: '/settings',
  NETWORK: '/settings/network',
  CURRENCY: '/settings/currency',
  REFERENDUM_DATA: '/settings/referendum',

  // Governance
  GOVERNANCE: '/governance',
  GOVERNANCE_LIST: '/governance/:chainId',
  GOVERNANCE_REFERENDUM_DEFAULT_CHAIN: '/governance/referendum/:referendumId',
  GOVERNANCE_REFERENDUM: '/governance/:chainId/referendum/:referendumId',

  // Fellowship
  FELLOWSHIP: '/fellowship',
  FELLOWSHIP_LIST: '/fellowship/:chainId',
  FELLOWSHIP_REFERENDUM: '/fellowship/:chainId/referendum/:referendumId',

  // Staking
  STAKING: '/staking',

  // Basket
  BASKET: '/basket',
} as const;

type ReplaceDynamicParts<T extends string> = T extends `${infer Start}/:${string}/${infer End}`
  ? `${Start}/${string}/${End}`
  : T extends `${infer Start}/:${string}`
    ? `${Start}/${string}`
    : T;

export type PathType = ReplaceDynamicParts<ObjectValues<typeof Paths>>;
