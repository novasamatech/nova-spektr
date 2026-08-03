import { useMemo } from 'react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { CaptionText, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { type Column, type LabelVariant, Label, Table } from '@/shared/ui-kit';
import { NamedAccount } from '@/widgets/NameResolver';
import { type NominationCounts, type NominationRow, type NominationStatus } from '../lib';

type Props = {
  rows: NominationRow[];
  counts: NominationCounts;
  chain: Chain;
  asset: Asset;
};

const STATUS_VARIANT: Record<NominationStatus, LabelVariant> = {
  active: 'green',
  waiting: 'orange',
  droppedOut: 'red',
};

export const NominationsTable = ({ rows, counts, chain, asset }: Props) => {
  const { t } = useI18n();

  const columns = useMemo<Column<NominationRow>[]>(
    () => [
      {
        key: 'accountId',
        title: t('dashboard.staking.positions.detail.nominations.validator'),
        width: '34%',
        render: (_value, row) => (
          <NamedAccount accountId={row.accountId} chain={chain} variant="short" iconSize={20} hideExplorers />
        ),
      },
      {
        key: 'status',
        title: t('dashboard.staking.positions.detail.nominations.status'),
        width: '18%',
        render: (_value, row) => (
          <Label variant={STATUS_VARIANT[row.status]}>
            {t(`dashboard.staking.positions.detail.nominations.${row.status}`)}
          </Label>
        ),
      },
      {
        key: 'ourStake',
        title: t('dashboard.staking.positions.detail.nominations.ourStake'),
        width: '18%',
        render: (_value, row) =>
          row.ourStake === null ? (
            <FootnoteText className="text-text-tertiary">{t('dashboard.staking.positions.noValue')}</FootnoteText>
          ) : (
            <AssetBalance value={row.ourStake} asset={asset} className="text-footnote" />
          ),
      },
      {
        key: 'commission',
        title: t('dashboard.staking.positions.detail.nominations.commission'),
        width: '10%',
        render: (_value, row) => (
          <FootnoteText className="text-text-secondary">
            {row.commission === null ? t('dashboard.staking.positions.noValue') : `${row.commission.toFixed(1)}%`}
          </FootnoteText>
        ),
      },
      {
        key: 'apy',
        title: t('dashboard.staking.positions.detail.nominations.apy'),
        width: '10%',
        render: (_value, row) =>
          row.apy === null ? (
            <FootnoteText className="text-text-tertiary">{t('dashboard.staking.positions.noValue')}</FootnoteText>
          ) : (
            <FootnoteText className="text-text-positive">{`${row.apy.toFixed(1)}%`}</FootnoteText>
          ),
      },
      {
        key: 'eraPoints',
        title: t('dashboard.staking.positions.detail.nominations.eraPoints'),
        width: '10%',
        render: (_value, row) => (
          <FootnoteText className="text-text-secondary">
            {row.eraPoints === null ? t('dashboard.staking.positions.noValue') : row.eraPoints}
          </FootnoteText>
        ),
      },
    ],
    [t, chain, asset],
  );

  if (rows.length === 0) {
    return (
      <FootnoteText className="px-5 py-4 text-text-tertiary">
        {t('dashboard.staking.positions.detail.nominations.empty')}
      </FootnoteText>
    );
  }

  return (
    <div className="flex flex-col">
      <Table columns={columns} data={rows} getRowKey={(row) => row.accountId} />

      <CaptionText className="px-3 py-3 text-text-tertiary">
        {t('dashboard.staking.positions.detail.nominations.footer', {
          total: counts.total,
          active: counts.active,
          waiting: counts.waiting,
          dropped: counts.droppedOut,
        })}
      </CaptionText>
    </div>
  );
};
