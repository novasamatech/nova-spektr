import { TEST_IDS } from '@/shared/constants';

import { type BasePageElements } from './BasePageElements';

export class DashboardPageElements implements BasePageElements {
  url = '/#/dashboard';

  // Portfolio Overview widget
  portfolioOverviewTitle = 'Portfolio Overview';
  assetsToggleLabel = 'Assets';
  networksToggleLabel = 'Networks';
  distributionLabel = 'Asset allocation';
  showAllLabel = 'Show all';
  holdingsByAssetLabel = 'Holdings by Asset';
  holdingsByChainLabel = 'Holdings by Chain';
  holdingRow = TEST_IDS.DASHBOARD.HOLDING_ROW;
  balanceTypeChipPrefix = TEST_IDS.DASHBOARD.BALANCE_TYPE_CHIP;
}
