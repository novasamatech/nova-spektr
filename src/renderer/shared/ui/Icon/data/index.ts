import AestheticImages, { type Aesthetic } from './aesthetics';
import ArrowImages, { type Arrow } from './arrow';
import ChevronImages, { type Chevron } from './chevron';
import ConfirmImages, { type Confirm } from './confirm';
import CurrencyImages, { type Currency } from './currency';
import ExplorerImages, { type Explorer } from './explorer';
import FlagImages, { type Flag } from './flag';
import FunctionalImages, { type Functional } from './functionals';
import KeyTypeImages, { type KeyImages } from './keyType';
import MiscImages, { type Misc } from './misc';
import MstImages, { type Mst } from './mst';
import NavigationImages, { type Navigation } from './navigation';
import SocialImages, { type Social } from './social';
import StakingImages, { type Staking } from './staking';
import WalletTypeImages, { type WalletImages } from './walletType';

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
  ...StakingImages,
  ...SocialImages,
  ...MstImages,
  ...KeyTypeImages,
  ...ConfirmImages,
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
  | Staking
  | Social
  | WalletImages
  | Mst
  | KeyImages
  | Confirm;

export default AllIcons;
