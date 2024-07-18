import NetworkImg, { ReactComponent as NetworkSvg } from '@shared/assets/images/functionals/network.svg';
import AddressBookImg, { ReactComponent as AddressBookSvg } from '@shared/assets/images/navigation/address-book.svg';
import AssetImg, { ReactComponent as AssetSvg } from '@shared/assets/images/navigation/assets.svg';
import GovernanceImg, { ReactComponent as GovernanceSvg } from '@shared/assets/images/navigation/governance.svg';
import NotificationImg, { ReactComponent as NotificationSvg } from '@shared/assets/images/navigation/notifications.svg';
import OperationsImg, { ReactComponent as OperationsSvg } from '@shared/assets/images/navigation/operations.svg';
import SettingsImg, { ReactComponent as SettingsSvg } from '@shared/assets/images/navigation/settings.svg';
import StakingImg, { ReactComponent as StakingSvg } from '@shared/assets/images/navigation/staking.svg';
import MatrixImg, { ReactComponent as MatrixSvg } from '@shared/assets/images/social/matrix.svg';

const NavigationImages = {
  asset: { svg: AssetSvg, img: AssetImg },
  governance: { svg: GovernanceSvg, img: GovernanceImg },
  operations: { svg: OperationsSvg, img: OperationsImg },
  settings: { svg: SettingsSvg, img: SettingsImg },
  staking: { svg: StakingSvg, img: StakingImg },
  addressBook: { svg: AddressBookSvg, img: AddressBookImg },
  notification: { svg: NotificationSvg, img: NotificationImg },
  network: { svg: NetworkSvg, img: NetworkImg },
  matrix: { svg: MatrixSvg, img: MatrixImg },
} as const;

export type Navigation = keyof typeof NavigationImages;

export default NavigationImages;
