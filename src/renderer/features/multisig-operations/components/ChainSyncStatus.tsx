import { useUnit } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon } from '@/shared/ui';
import { Popover } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { operationsContextModel } from '../model/context';

export const ChainSyncStatus = () => {
  const { t } = useI18n();
  const { expected, fetched } = useUnit(operationsContextModel.$chainSyncState);

  const totalExpected = expected.length;
  const totalFetched = fetched.length;
  const isLoading = totalFetched < totalExpected;

  // Still waiting for APIs to connect - show connecting message
  if (totalExpected === 0) {
    return <FootnoteText className="text-text-tertiary">{t('operations.sync.connecting')}</FootnoteText>;
  }

  if (!isLoading) {
    return null;
  }

  const statusText = t('operations.sync.syncing', { synced: totalFetched, total: totalExpected });

  return (
    <Popover>
      <Popover.Trigger>
        <button type="button" className="flex cursor-pointer items-center gap-x-1">
          <FootnoteText className="text-text-tertiary">{statusText}</FootnoteText>
        </button>
      </Popover.Trigger>

      <Popover.Content>
        <ChainSyncPopoverContent expected={expected} fetched={fetched} />
      </Popover.Content>
    </Popover>
  );
};

type PopoverContentProps = {
  expected: ChainId[];
  fetched: ChainId[];
};

const ChainSyncPopoverContent = ({ expected, fetched }: PopoverContentProps) => {
  const { t } = useI18n();

  return (
    <div className="flex w-[280px] flex-col gap-y-1 p-3">
      <ul className="flex flex-col gap-y-1">
        {expected.map(chainId => {
          const isFetched = fetched.includes(chainId);

          return (
            <li key={chainId} className="flex items-center justify-between gap-x-2 py-1">
              <ChainTitle chainId={chainId} fontClass="text-text-primary" />

              <div className="flex items-center gap-x-1.5">
                {isFetched && (
                  <>
                    <Icon name="checkmarkOutline" size={14} className="text-icon-positive" />
                    <FootnoteText className="text-text-positive">{t('operations.sync.synced')}</FootnoteText>
                  </>
                )}

                {!isFetched && (
                  <FootnoteText className="text-text-tertiary">{t('operations.sync.loading')}</FootnoteText>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
