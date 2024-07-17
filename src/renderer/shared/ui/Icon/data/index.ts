import CurrencyImages, { type Currency } from './currency';
import NavigationImages, { type Navigation } from './navigation';
import ChevronImages, { type Chevron } from './chevron';
import FunctionalImages, { type Functional } from './functionals';
import MiscImages, { type Misc } from './misc';
import FlagImages, { type Flag } from './flag';
import ExplorerImages, { type Explorer } from './explorer';
import AestheticImages, { type Aesthetic } from './aesthetics';
import ArrowImages, { type Arrow } from './arrow';
import WalletTypeImages, { type WalletImages } from './walletType';
import StakingImages, { type Staking } from './staking';
import SocialImages, { type Social } from './social';
import MstImages, { type Mst } from './mst';
import KeyTypeImages, { type KeyImages } from './keyType';
import ConfirmImages, { type Confirm } from './confirm';

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
