import CurrencyImages, { Currency } from './currency';
import NavigationImages, { Navigation } from './navigation';
import ChevronImages, { Chevron } from './chevron';
import FunctionalImages, { Functional } from './functionals';
import MiscImages, { Misc } from './misc';
import FlagImages, { Flag } from './flag';
import ExplorerImages, { Explorer } from './explorer';
import AestheticImages, { Aesthetic } from './aesthetics';
import ArrowImages, { Arrow } from './arrow';
import WalletTypeImages, { WalletType } from './walletType';

const AllIcons = {
  ...CurrencyImages,
  ...NavigationImages,
  ...ChevronImages,
  ...FunctionalImages,
  ...MiscImages,
  ...FlagImages,
  ...ExplorerImages,
  ...AestheticImages,
  ...ArrowImages,
  ...WalletTypeImages,
};

export type IconNames =
  | Currency
  | Navigation
  | Chevron
  | Functional
  | Misc
  | Flag
  | Explorer
  | Aesthetic
  | Arrow
  | WalletType;

export default AllIcons;
