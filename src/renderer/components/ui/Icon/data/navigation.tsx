import AssetImg, { ReactComponent as AssetSvg } from '@images/navigation/asset.svg';
import CrowdloansImg, { ReactComponent as CrowdloansSvg } from '@images/navigation/crowdloans.svg';
import DashboardImg, { ReactComponent as DashboardSvg } from '@images/navigation/dashboard.svg';
import GovernanceImg, { ReactComponent as GovernanceSvg } from '@images/navigation/governance.svg';
import OperationsImg, { ReactComponent as OperationsSvg } from '@images/navigation/operations.svg';
import SettingsImg, { ReactComponent as SettingsSvg } from '@images/navigation/settings.svg';
import StakingImg, { ReactComponent as StakingSvg } from '@images/navigation/staking.svg';
import WalletsImg, { ReactComponent as WalletsSvg } from '@images/navigation/wallets.svg';
import BalanceImg, { ReactComponent as BalanceSvg } from '@images/navigation/balance.svg';
import TransferImg, { ReactComponent as TransferSvg } from '@images/navigation/transfer.svg';
import BookImg, { ReactComponent as BookSvg } from '@images/navigation/book.svg';
import HelpImg, { ReactComponent as HelpSvg } from '@images/navigation/help.svg';

const NavigationImages = {
  asset: { svg: AssetSvg, img: AssetImg },
  crowdloans: { svg: CrowdloansSvg, img: CrowdloansImg },
  dashboard: { svg: DashboardSvg, img: DashboardImg },
  governance: { svg: GovernanceSvg, img: GovernanceImg },
  operations: { svg: OperationsSvg, img: OperationsImg },
  settings: { svg: SettingsSvg, img: SettingsImg },
  staking: { svg: StakingSvg, img: StakingImg },
  wallets: { svg: WalletsSvg, img: WalletsImg },
  balance: { svg: BalanceSvg, img: BalanceImg },
  transfer: { svg: TransferSvg, img: TransferImg },
  book: { svg: BookSvg, img: BookImg },
  help: { svg: HelpSvg, img: HelpImg },
} as const;

export type Navigation = keyof typeof NavigationImages;

export default NavigationImages;
