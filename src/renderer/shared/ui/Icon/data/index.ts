import { Arrows, ArrowImages } from './arrows';
import { DerivationImages, Derivations } from './derivations';
import { Explorers, ExplorerImages } from './explorers';
import { Languages, LanguageImages } from './languages';
import { Product, ProductImages } from './product';
import { Service, ServiceImages } from './service';
import { Social, SocialImages } from './social';
import { Staking, StakingImages } from './staking';
import { Status, StatusImages } from './status';
import { WalletTypes, WalletTypeImages } from './walletTypes';

export type IconNames =
  | Arrows
  | Derivations
  | Explorers
  | Languages
  | Product
  | Service
  | Social
  | Staking
  | Status
  | WalletTypes;

export const IconCollection = {
  ...ArrowImages,
  ...DerivationImages,
  ...ExplorerImages,
  ...LanguageImages,
  ...ProductImages,
  ...ServiceImages,
  ...SocialImages,
  ...StakingImages,
  ...StatusImages,
  ...WalletTypeImages,
};
