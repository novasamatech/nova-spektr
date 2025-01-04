import NetworkIcon from '@/shared/assets/images/functionals/network.svg?jsx';
import AddressBookIcon from '@/shared/assets/images/navigation/address-book.svg?jsx';
import AssetIcon from '@/shared/assets/images/navigation/assets.svg?jsx';
import FellowshipIcon from '@/shared/assets/images/navigation/fellowship.svg?jsx';
import GovernanceIcon from '@/shared/assets/images/navigation/governance.svg?jsx';
import NotificationIcon from '@/shared/assets/images/navigation/notifications.svg?jsx';
import OperationsIcon from '@/shared/assets/images/navigation/operations.svg?jsx';
import SettingsIcon from '@/shared/assets/images/navigation/settings.svg?jsx';
import StakingIcon from '@/shared/assets/images/navigation/staking.svg?jsx';

const NavigationImages = {
  asset: { svg: AssetIcon },
  governance: { svg: GovernanceIcon },
  fellowshipNav: { svg: FellowshipIcon },
  operations: { svg: OperationsIcon },
  settings: { svg: SettingsIcon },
  staking: { svg: StakingIcon },
  addressBook: { svg: AddressBookIcon },
  notification: { svg: NotificationIcon },
  network: { svg: NetworkIcon },
} as const;

export type Navigation = keyof typeof NavigationImages;

export default NavigationImages;
