import { useUnit } from 'effector-react';
import { useCallback, useMemo, useState } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset } from '@/shared/lib/utils';
import { currencySelect } from '@/aggregates/currency-select';
import { KpiCard, KpiWidgetFrame } from '@/features/dashboard-staking-kpi';
import { useMinStakeRows } from '../hooks/useMinStakeRows';
import { useThresholdAssets } from '../hooks/useThresholdAssets';
import { ERA_DEPTH } from '../lib/constants';
import { formatEraNumber, formatSignedPercent } from '../lib/format';
import { buildWindow } from '../lib/scale';

import { MinStakeModal } from './MinStakeModal';
import { MinStakeSparkline } from './MinStakeSparkline';

const EM_DASH = '—';

/**
 * "Min stake to enter the active set" as a KPI card: the active era's entry
 * threshold, its change against seven eras ago, and a zoomed sparkline of the
 * band. Network-level — unlike the cards beside it this one ignores the
 * dashboard's account picker entirely: the threshold is a fact about the chain,
 * so an empty selection must not blank it.
 *
 * The network shown is the one last picked in the drill-down, so the card and
 * the modal never disagree about which chain they describe.
 */
export const MinStakeKpiWidget = () => {
  const { t } = useI18n();
  const fiatFlag = useUnit(currencySelect.$fiatFlag);

  const assets = useThresholdAssets();
  const [pickedChainId, setPickedChainId] = useState<ChainId | null>(null);
  const [open, setOpen] = useState(false);

  const selected = assets.find((asset) => asset.chainId === pickedChainId) ?? assets[0];
  const { rows, pending } = useMinStakeRows(selected?.chain ?? null, selected?.asset.precision ?? 0, ERA_DEPTH);

  const scaleWindow = useMemo(
    () => (rows && rows.length > 0 ? buildWindow(rows.map((row) => row.tokens)) : null),
    [rows],
  );

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  if (!selected) return null;

  const title = t('dashboard.staking.minStake.title');
  const current = rows?.at(-1);
  const first = rows?.[0];
  const hasData = current !== undefined && first !== undefined && scaleWindow !== null;

  const value = hasData ? formatAsset(current.minStake, selected.asset) : EM_DASH;
  const subline = hasData
    ? current === first
      ? t('dashboard.staking.minStake.headlineEra', { era: formatEraNumber(current.era) })
      : t('dashboard.staking.minStake.subline', {
          delta: formatSignedPercent(current.tokens, first.tokens),
          era: formatEraNumber(first.era),
        })
    : t('dashboard.staking.minStake.noData');
  // An explicit aria-label replaces the card's inner text for screen readers,
  // so it must carry what the card shows. The system tests anchor on the title
  // prefix of this label.
  const ariaLabel = [title, value, subline].join(', ');

  return (
    <KpiWidgetFrame>
      <KpiCard
        title={t('dashboard.staking.minStake.shortTitle')}
        ariaLabel={ariaLabel}
        loading={pending}
        value={value}
        valueClass={hasData ? undefined : 'text-text-tertiary'}
        subline={subline}
        visual={hasData && rows ? <MinStakeSparkline rows={rows} scaleWindow={scaleWindow} /> : null}
        onClick={handleOpen}
      />

      {open && (
        <MinStakeModal
          assets={assets}
          selected={selected}
          showFiat={fiatFlag}
          onChainChange={setPickedChainId}
          onClose={handleClose}
        />
      )}
    </KpiWidgetFrame>
  );
};
