import CurrencyImages, { Currency } from './currency';
import NavigationImages, { Navigation } from './navigation';
import ChevronImages, { Chevron } from './chevron';
import FunctionalImages, { Functional } from './functionals';
import MiscImages, { Misc } from './misc';
import FlagImages, { Flag } from './flag';
import ExplorerImages, { Explorer } from './explorer';
import AestheticImages, { Aesthetic } from './aesthetics';
import ArrowImages, { Arrow } from './arrow';
import WalletTypeImages, { WalletImages } from './walletType';
import StakingImages, { Staking } from './staking';
import SocialImages, { Social } from './social';
import MstImages, { Mst } from '@renderer/shared/ui/Icon/data/mst';
import WalletTypeImagesNew, { WalletTypeNew } from "@renderer/shared/ui/Icon/data/walletTypeNew";

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
  ...WalletTypeImagesNew,
  ...StakingImages,
  ...SocialImages,
  ...MstImages,
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
  | WalletTypeNew
  | Mst;

export default AllIcons;
