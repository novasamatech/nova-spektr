import { memo } from 'react';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { CaptionText, FootnoteText, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { type VerifyProxyOpInfo } from '../lib/verify-proxy-op';

// Match the status palette used by `OperationIcon` so the verify-proxy card sits
// visually alongside the rest of the rows. Keep this in sync with that file.
const StatusBackground: Record<MultisigOperation['status'], string> = {
  pending: 'bg-icon-warning',
  executed: 'bg-icon-positive',
  cancelled: 'bg-icon-negative',
  error: 'bg-icon-negative',
};

type Props = {
  info: VerifyProxyOpInfo;
  chain: Chain | undefined;
  status: MultisigOperation['status'];
};

export const VerifyProxyOperationCard = memo(({ chain, status }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex w-[450px] items-center gap-x-3">
      <div className={cnTw('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', StatusBackground[status])}>
        <Icon name="checkmarkOutline" size={20} className="text-white" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-y-0.5 overflow-hidden">
        <FootnoteText className="truncate text-text-primary">{t('operations.verifyProxy.title')}</FootnoteText>
        {chain && <ChainTitle chainId={chain.chainId} fontClass="text-help-text text-text-tertiary" />}
      </div>

      <div className="flex w-[200px] shrink-0 items-center">
        <Tooltip>
          <Tooltip.Trigger>
            <div className="inline-flex items-center rounded-[20px] border border-icon-accent/30 bg-icon-accent/8 px-2.5 py-1 text-icon-accent">
              <CaptionText className="text-inherit uppercase">{t('operations.verifyProxy.tag')}</CaptionText>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>{t('operations.verifyProxy.tooltip')}</Tooltip.Content>
        </Tooltip>
      </div>
    </div>
  );
});
