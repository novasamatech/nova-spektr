import AssetImg, { ReactComponent as AssetSvg } from '@images/navigation/assets-tab.svg';
import OperationsImg, { ReactComponent as OperationsSvg } from '@images/navigation/operations-tab.svg';
import SettingsImg, { ReactComponent as SettingsSvg } from '@images/navigation/settings-tab.svg';
import StakingImg, { ReactComponent as StakingSvg } from '@images/navigation/staking-tab.svg';
import AddressBookImg, { ReactComponent as AddressBookSvg } from '@images/navigation/address-book-tab.svg';
import NotificationImg, { ReactComponent as NotificationSvg } from '@images/navigation/notifications-tab.svg';
import CrowdloansImg, { ReactComponent as CrowdloansSvg } from '@images/navigation/crowdloans.svg';
import DashboardImg, { ReactComponent as DashboardSvg } from '@images/navigation/dashboard.svg';
import GovernanceImg, { ReactComponent as GovernanceSvg } from '@images/navigation/governance.svg';
import BalanceImg, { ReactComponent as BalanceSvg } from '@images/navigation/balance.svg';
import HistoryImg, { ReactComponent as HistorySvg } from '@images/navigation/history.svg';
import TransferImg, { ReactComponent as TransferSvg } from '@images/navigation/transfer.svg';
import HelpImg, { ReactComponent as HelpSvg } from '@images/navigation/help.svg';

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
} as const;

export type Navigation = keyof typeof NavigationImages;

export default NavigationImages;
