import AssetImg, { ReactComponent as AssetSvg } from '@shared/assets/images/navigation/assets-tab.svg';
import OperationsImg, { ReactComponent as OperationsSvg } from '@shared/assets/images/navigation/operations-tab.svg';
import SettingsImg, { ReactComponent as SettingsSvg } from '@shared/assets/images/navigation/settings-tab.svg';
import StakingImg, { ReactComponent as StakingSvg } from '@shared/assets/images/navigation/staking-tab.svg';
import AddressBookImg, {
  ReactComponent as AddressBookSvg,
} from '@shared/assets/images/navigation/address-book-tab.svg';
import NotificationImg, {
  ReactComponent as NotificationSvg,
} from '@shared/assets/images/navigation/notifications-tab.svg';
import CrowdloansImg, { ReactComponent as CrowdloansSvg } from '@shared/assets/images/navigation/crowdloans.svg';
import DashboardImg, { ReactComponent as DashboardSvg } from '@shared/assets/images/navigation/dashboard.svg';
import GovernanceImg, { ReactComponent as GovernanceSvg } from '@shared/assets/images/navigation/governance.svg';
import BalanceImg, { ReactComponent as BalanceSvg } from '@shared/assets/images/navigation/balance.svg';
import HistoryImg, { ReactComponent as HistorySvg } from '@shared/assets/images/navigation/history.svg';
import TransferImg, { ReactComponent as TransferSvg } from '@shared/assets/images/navigation/transfer.svg';
import HelpImg, { ReactComponent as HelpSvg } from '@shared/assets/images/navigation/help.svg';
import NetworkImg, { ReactComponent as NetworkSvg } from '@shared/assets/images/functionals/network.svg';
import MatrixImg, { ReactComponent as MatrixSvg } from '@shared/assets/images/social/matrix.svg';
import UpdateImg, { ReactComponent as UpdateSvg } from '@shared/assets/images/navigation/update.svg';

const NavigationImages = {
  asset: { svg: AssetSvg, img: AssetImg },
  crowdloans: { svg: CrowdloansSvg, img: CrowdloansImg },
  dashboard: { svg: DashboardSvg, img: DashboardImg },
  governance: { svg: GovernanceSvg, img: GovernanceImg },
  operations: { svg: OperationsSvg, img: OperationsImg },
  settings: { svg: SettingsSvg, img: SettingsImg },
  staking: { svg: StakingSvg, img: StakingImg },
  balance: { svg: BalanceSvg, img: BalanceImg },
  history: { svg: HistorySvg, img: HistoryImg },
  transfer: { svg: TransferSvg, img: TransferImg },
  addressBook: { svg: AddressBookSvg, img: AddressBookImg },
  help: { svg: HelpSvg, img: HelpImg },
  notification: { svg: NotificationSvg, img: NotificationImg },
  network: { svg: NetworkSvg, img: NetworkImg },
  matrix: { svg: MatrixSvg, img: MatrixImg },
  update: { svg: UpdateSvg, img: UpdateImg },
} as const;

export type Navigation = keyof typeof NavigationImages;

export default NavigationImages;
