/* eslint-disable i18next/no-literal-string */
import DerivationsSprite from '@images/icons/derivations.svg';

export const DerivationImages = {
  'derivation-custom': {
    svg: true,
    size: { 20: `${DerivationsSprite}#derivation-custom-20` },
  },
  'derivation-governance': {
    svg: true,
    size: { 20: `${DerivationsSprite}#derivation-governance-20` },
  },
  'derivation-hot': {
    svg: true,
    size: { 20: `${DerivationsSprite}#derivation-hot-20` },
  },
  'derivation-key': {
    svg: true,
    size: { 20: `${DerivationsSprite}#derivation-key-20` },
  },
  'derivation-public': {
    svg: true,
    size: { 20: `${DerivationsSprite}#derivation-public-20` },
  },
  'derivation-staking': {
    svg: true,
    size: { 20: `${DerivationsSprite}#derivation-staking-20` },
  },
} as const;

export type Derivations = keyof typeof DerivationImages;
