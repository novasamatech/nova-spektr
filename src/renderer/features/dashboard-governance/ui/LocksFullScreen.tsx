import { useCallback } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Switch } from '@/shared/ui';
import { Modal, Select } from '@/shared/ui-kit';
import { type LocksTableState } from '../hooks/useLocksTable';
import { ALL_CHAINS } from '../lib/constants';

import { LocksTable } from './LocksTable';
import { LocksTotals } from './LocksTotals';

type Props = {
  state: LocksTableState;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
};

/**
 * The same locks, given the whole window — `size="3xl" height="full"`, the
 * configuration the Accounts table and the validator picker use, so the app's
 * full-screen tables read as one thing. Shares the card's `useLocksTable`
 * instance: the filters set here are what the next open shows. Escape, the
 * cross and an outside click all close it; nothing is lost by closing.
 */
export const LocksFullScreen = ({ state, isOpen, onToggle }: Props) => {
  const { t } = useI18n();
  const {
    rows,
    visibleRows,
    totals,
    currency,
    uniqueChains,
    chainFilter,
    setChainFilter,
    claimableOnly,
    setClaimableOnly,
    showTotals,
  } = state;

  const handleChainFilterChange = useCallback(
    (value: string) => setChainFilter(value === ALL_CHAINS ? null : value),
    [setChainFilter],
  );

  return (
    <Modal isOpen={isOpen} size="3xl" height="full" onToggle={onToggle}>
      <Modal.Title close>{t('dashboard.locks.fullViewTitle')}</Modal.Title>

      {/* The table owns its own scroll region (rows only, strip and filters
          stay put), so the modal must not wrap it in a second scroller. */}
      <Modal.Content disableScroll>
        <div className="flex h-full min-h-0 flex-col overflow-hidden px-5 py-3">
          {showTotals && totals && <LocksTotals totals={totals} currency={currency} />}

          {rows.length > 0 && (
            <div className={cnTw('flex items-center gap-3', showTotals && 'mt-3')}>
              <FootnoteText className="text-text-tertiary">
                {t('dashboard.governanceLocks.rowsCount', { count: visibleRows.length })}
              </FootnoteText>
              <div className="ml-auto flex items-center gap-3">
                <Switch checked={claimableOnly} onChange={setClaimableOnly}>
                  {t('dashboard.governanceLocks.claimableOnly')}
                </Switch>
                <div className="w-[180px]">
                  <Select
                    height="sm"
                    placeholder={t('dashboard.governanceLocks.allChains')}
                    value={chainFilter}
                    onChange={handleChainFilterChange}
                  >
                    <Select.Item value={ALL_CHAINS}>
                      <span>{t('dashboard.governanceLocks.allChains')}</span>
                    </Select.Item>
                    {uniqueChains.map((chain) => (
                      <Select.Item key={chain.chainId} value={chain.chainId}>
                        <div className="flex items-center gap-1.5">
                          <img src={chain.chainIcon} alt="" width={20} height={20} className="h-5 w-5" />
                          <span>{chain.chainName}</span>
                        </div>
                      </Select.Item>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          )}

          <LocksTable mode="full" state={state} rows={visibleRows} />
        </div>
      </Modal.Content>
    </Modal>
  );
};
