import { memo, useMemo } from 'react';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { CaptionText, FootnoteText } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { type ProxyEditInfo } from '../lib/proxy-edit';

type Props = {
  info: ProxyEditInfo;
  chain: Chain | undefined;
};

export const EditControllerOperationCard = memo(({ info, chain }: Props) => {
  const { t } = useI18n();

  const addressPrefix = chain?.addressPrefix;

  const oldAddress = useMemo(
    () => toAddress(info.oldControllerAccountId, { prefix: addressPrefix }),
    [info.oldControllerAccountId, addressPrefix],
  );
  const newAddress = useMemo(
    () => toAddress(info.newControllerAccountId, { prefix: addressPrefix }),
    [info.newControllerAccountId, addressPrefix],
  );

  const title = info.isTrustedFlow
    ? t('operations.editController.trustedTitle')
    : t('operations.editController.verifiedTitle');

  const tagLabel = info.isTrustedFlow
    ? t('operations.editController.trustedTag')
    : t('operations.editController.verifiedTag');

  const tagTooltip = info.isTrustedFlow
    ? t('operations.editController.trustedTooltip')
    : t('operations.editController.verifiedTooltip');

  const tagPalette = info.isTrustedFlow
    ? 'border-icon-warning/30 bg-icon-warning/8 text-icon-warning'
    : 'border-icon-positive/30 bg-icon-positive/8 text-icon-positive';

  return (
    <div className="flex w-[450px] items-center gap-x-3">
      <div className="flex shrink-0 items-center gap-x-1">
        <Identicon address={oldAddress} size={28} background={false} canCopy={false} />
        <span aria-hidden="true" className="text-text-tertiary">
          →
        </span>
        <Identicon address={newAddress} size={28} background={false} canCopy={false} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-y-0.5 overflow-hidden">
        <FootnoteText className="truncate text-text-primary">{title}</FootnoteText>
        <div className="flex items-center gap-x-2">
          {chain && <ChainTitle chainId={chain.chainId} fontClass="text-help-text text-text-tertiary" />}
          <Tooltip>
            <Tooltip.Trigger>
              <div className={`inline-flex items-center rounded-[20px] border px-2.5 py-1 ${tagPalette}`}>
                <CaptionText className="text-inherit uppercase">{tagLabel}</CaptionText>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content>{tagTooltip}</Tooltip.Content>
          </Tooltip>
        </div>
      </div>
    </div>
  );
});
