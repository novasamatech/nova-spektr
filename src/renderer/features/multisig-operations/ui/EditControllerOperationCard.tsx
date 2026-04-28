import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { CaptionText, FootnoteText } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { accounts } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { type ProxyEditInfo } from '../lib/proxy-edit';

type Props = {
  info: ProxyEditInfo;
  chain: Chain | undefined;
  wallets: Wallet[];
};

export const EditControllerOperationCard = memo(({ info, chain, wallets }: Props) => {
  const { t } = useI18n();
  const allAccounts = useUnit(accounts.$list);

  const addressPrefix = chain?.addressPrefix;

  const oldAddress = useMemo(
    () => toAddress(info.oldControllerAccountId, { prefix: addressPrefix }),
    [info.oldControllerAccountId, addressPrefix],
  );
  const newAddress = useMemo(
    () => toAddress(info.newControllerAccountId, { prefix: addressPrefix }),
    [info.newControllerAccountId, addressPrefix],
  );

  const newControllerName = useMemo(() => {
    const account = allAccounts.find(a => a.accountId === info.newControllerAccountId);
    if (account) {
      const wallet = wallets.find(w => w.id === account.walletId);
      if (wallet?.name) return wallet.name;
      if (account.name) return account.name;
    }

    return toShortAddress(newAddress, 6);
  }, [allAccounts, wallets, info.newControllerAccountId, newAddress]);

  const title = t('operations.editController.title', {
    name: newControllerName || t('operations.editController.unknownName'),
  });

  return (
    <div className="flex w-[450px] items-center gap-x-3">
      <div className="flex shrink-0 items-center gap-x-1">
        <span className="opacity-40 grayscale">
          <Identicon address={oldAddress} size={28} background={false} canCopy={false} />
        </span>
        <span aria-hidden="true" className="text-text-tertiary">
          →
        </span>
        <Identicon address={newAddress} size={28} background={false} canCopy={false} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-y-0.5 overflow-hidden">
        <FootnoteText className="truncate text-text-primary">{title}</FootnoteText>
        <div className="flex items-center gap-x-2">
          {chain && <ChainTitle chainId={chain.chainId} fontClass="text-help-text text-text-tertiary" />}
          {info.isTrustedFlow && (
            <div className="inline-flex items-center rounded-[20px] border border-icon-warning/30 bg-icon-warning/8 px-2.5 py-1">
              <CaptionText className="text-icon-warning uppercase">
                {t('operations.editController.trustedTag')}
              </CaptionText>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
