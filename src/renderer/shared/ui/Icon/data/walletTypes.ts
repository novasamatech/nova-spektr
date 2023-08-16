import WalletTypesSprite from '@images/icons/walletTypes.svg';

export const WalletTypeImages = {
  ledger: {
    svg: true,
    size: { 32: `${WalletTypesSprite}#ledger-32` },
  },
  novawallet: {
    svg: true,
    size: { 32: `${WalletTypesSprite}#novawallet-32` },
  },
  walletconnect: {
    svg: true,
    size: { 32: `${WalletTypesSprite}#walletconnect-32` },
  },
  multishard: {
    svg: true,
    size: {
      16: `${WalletTypesSprite}#multishard-16`,
      20: `${WalletTypesSprite}#multishard-20`,
    },
  },
  multisig: {
    svg: true,
    size: {
      16: `${WalletTypesSprite}#multisig-16`,
      20: `${WalletTypesSprite}#multisig-20`,
    },
  },
  polkadotvault: {
    svg: true,
    size: {
      16: `${WalletTypesSprite}#polkadotvault-16`,
      20: `${WalletTypesSprite}#polkadotvault-20`,
      32: `${WalletTypesSprite}#polkadotvault-32`,
    },
  },
  watchonly: {
    svg: true,
    size: {
      16: `${WalletTypesSprite}#watchonly-16`,
      20: `${WalletTypesSprite}#watchonly-20`,
      32: `${WalletTypesSprite}#watchonly-32`,
    },
  },
} as const;

export type WalletTypes = keyof typeof WalletTypeImages;
