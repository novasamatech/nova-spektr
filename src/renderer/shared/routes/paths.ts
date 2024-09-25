import { type ObjectValues } from '../core';

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

  // Staking
  STAKING: '/staking',

  // Basket
  BASKET: '/basket',
} as const;

export type PathType = ObjectValues<typeof Paths>;
