import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { ALLOCATION_COLORS } from '@/shared/ui/chart-constants';
import { type BalanceType } from '../lib/balanceTypes';

type Props = {
  type: BalanceType;
};

/**
 * Colored dot + localized balance-type name. Shown in the detail-modal headers
 * to mark that the breakdown is scoped to the active cross-filter.
 */
export const BalanceTypeBadge = ({ type }: Props) => {
  const { t } = useI18n();

  return (
    <span className="flex items-center gap-1">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ALLOCATION_COLORS[type] }} />
      <FootnoteText className="text-text-tertiary">{t(`dashboard.portfolioOverview.balanceType.${type}`)}</FootnoteText>
    </span>
  );
};
