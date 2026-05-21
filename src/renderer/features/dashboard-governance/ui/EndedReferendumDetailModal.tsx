import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, formatBalance, toAddress, toShortAddress } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { type Column, Modal, Table } from '@/shared/ui-kit';
import { type EndedReferendum, type EndedVote } from '../hooks/useEndedReferendums';

import { OUTCOME_I18N_KEY, OUTCOME_STYLES, formatEndDate } from './referendum-helpers';

type Props = {
  referendum: EndedReferendum;
  onClose: () => void;
};

export const EndedReferendumDetailModal = memo(({ referendum, onClose }: Props) => {
  const { t, formatDate } = useI18n();

  const { formatted: lockedFormatted } = formatBalance(referendum.totalLockedAmount, referendum.precision);
  const outcomeLabel = t(`dashboard.referendums.${OUTCOME_I18N_KEY[referendum.outcome]}`);

  const columns: Column<EndedVote>[] = useMemo(
    () => [
      {
        key: 'name',
        title: t('dashboard.activeReferendums.detail.account'),
        width: '30%',
        render: (_, item) => (
          <div className="flex items-center gap-2">
            <Identicon address={toAddress(item.address)} size={20} />
            <div className="min-w-0">
              <FootnoteText className="truncate font-semibold">{item.name}</FootnoteText>
              <FootnoteText className="text-text-tertiary">{toShortAddress(item.address)}</FootnoteText>
            </div>
          </div>
        ),
      },
      {
        key: 'direction',
        title: t('dashboard.activeReferendums.detail.vote'),
        width: '10%',
        render: (_, item) => {
          const colorClass =
            item.direction === 'aye'
              ? 'text-text-positive'
              : item.direction === 'nay'
                ? 'text-text-negative'
                : 'text-text-tertiary';

          const label =
            item.direction === 'aye'
              ? t('dashboard.activeReferendums.aye')
              : item.direction === 'nay'
                ? t('dashboard.activeReferendums.nay')
                : t('dashboard.activeReferendums.abstain');

          return <FootnoteText className={cnTw('font-semibold', colorClass)}>{label}</FootnoteText>;
        },
      },
      {
        key: 'amount',
        title: t('dashboard.activeReferendums.detail.amount'),
        width: '20%',
        render: (_, item) => {
          const bal = formatBalance(item.amount, item.precision);

          return (
            <FootnoteText className="tabular-nums">
              {bal.formatted} {item.symbol}
            </FootnoteText>
          );
        },
      },
      {
        key: 'conviction',
        title: t('dashboard.activeReferendums.detail.conviction'),
        width: '15%',
        render: (_, item) => <FootnoteText className="tabular-nums">{item.conviction}</FootnoteText>,
      },
      {
        key: 'unlockable',
        title: t('dashboard.referendums.detail.lockStatus'),
        width: '25%',
        render: (_, item) => {
          if (item.unlockable) {
            return (
              <FootnoteText className="font-semibold text-text-positive">
                {t('dashboard.referendums.unlockableStatus')}
              </FootnoteText>
            );
          }

          if (item.unlockAtMs) {
            return (
              <FootnoteText className="text-text-warning">
                {t('dashboard.referendums.lockedUntil', { date: formatDate(item.unlockAtMs, 'MMM d, yyyy') })}
              </FootnoteText>
            );
          }

          return <FootnoteText className="text-text-tertiary">{t('dashboard.referendums.shadowedLock')}</FootnoteText>;
        },
      },
    ],
    [t],
  );

  return (
    <Modal isOpen size="lg" onToggle={(open) => !open && onClose()}>
      <Modal.Title close>{t('dashboard.referendums.detail.endedTitle')}</Modal.Title>
      <Modal.Content disableScroll>
        {/* Header section */}
        <div className="flex items-center gap-3 px-5 py-3">
          <img src={referendum.chainIcon} alt={referendum.chainName} className="h-8 w-8" />
          <div className="min-w-0 flex-1">
            <FootnoteText className="font-bold">{referendum.title}</FootnoteText>
            <div className="flex items-center gap-2">
              <FootnoteText className="font-mono text-text-tertiary">#{referendum.id}</FootnoteText>
              <FootnoteText className="text-text-tertiary">&middot;</FootnoteText>
              <FootnoteText className="text-text-tertiary">{referendum.chainName}</FootnoteText>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span
              className={cnTw('rounded px-2 py-0.5 text-help-text font-semibold', OUTCOME_STYLES[referendum.outcome])}
            >
              {outcomeLabel}
            </span>
          </div>
        </div>

        {/* End date + locked amount */}
        <div className="flex items-center justify-between px-5 py-2">
          <FootnoteText className="text-text-tertiary">
            {t('dashboard.referendums.detail.endedDate', { date: formatEndDate(referendum.endedAtMs, t, formatDate) })}
          </FootnoteText>
          <FootnoteText className="font-bold tabular-nums">
            {lockedFormatted} {referendum.symbol}
          </FootnoteText>
        </div>

        <div className="border-t border-divider" />

        {/* Our Votes section */}
        {referendum.ourVotes.length > 0 && (
          <>
            <div className="px-5 pt-4 pb-2">
              <SmallTitleText>{t('dashboard.activeReferendums.detail.ourVotes')}</SmallTitleText>
            </div>

            <div className="overflow-y-auto px-5 pb-4" style={{ maxHeight: 300 }}>
              <Table columns={columns} data={referendum.ourVotes} />
            </div>
          </>
        )}

        {referendum.ourVotes.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <FootnoteText className="text-text-tertiary">&mdash;</FootnoteText>
          </div>
        )}
      </Modal.Content>
    </Modal>
  );
});
