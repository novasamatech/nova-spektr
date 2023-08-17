import ProductSprite from '@images/icons/product.svg';

export const ProductImages = {
  'address-book': {
    svg: true,
    size: { 20: `${ProductSprite}#address-book-20` },
  },
  notifications: {
    svg: true,
    size: { 20: `${ProductSprite}#notifications-20` },
  },
  operations: {
    svg: true,
    size: { 20: `${ProductSprite}#operations-20` },
  },
  settings: {
    svg: true,
    size: { 20: `${ProductSprite}#settings-20` },
  },
  staking: {
    svg: true,
    size: { 20: `${ProductSprite}#staking-20` },
  },
  assets: {
    svg: true,
    size: { 20: `${ProductSprite}#assets-20` },
  },
} as const;

export type Product = keyof typeof ProductImages;
