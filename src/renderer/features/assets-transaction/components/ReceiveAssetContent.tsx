import { useUnit } from 'effector-react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon } from '@/shared/ui';
import { DefaultExplorer, ExplorerIcons } from '@/shared/ui/ExplorerLink/constants';
import { Address } from '@/shared/ui-entities';
import { Box, Copy } from '@/shared/ui-kit';
import { useAccountName } from '@/domains/network';
import { QrTextGenerator } from '@/entities/transaction';
import { assetTransactionUtils } from '../lib/utils';
import { receiveModel } from '../model/receive-model';

import { CompareAddressModal } from './CompareAddressModal';

type Props = {
  chain: Chain;
  asset: Asset;
};

export const ReceiveAssetContent = ({ chain, asset }: Props) => {
  const { t } = useI18n();

  const selectedAccount = useUnit(receiveModel.$selectedAccount);
  const resolvedName = useAccountName({
    accountId: selectedAccount?.accountId ?? null,
    chain,
  });

  if (!selectedAccount) return null;

  const address = toAddress(selectedAccount.accountId, { prefix: chain.addressPrefix });
  const legacyAddress = toAddress(selectedAccount.accountId, {
    prefix: chain.legacyAddressPrefix ?? chain.addressPrefix,
  });
  const isUnifiedAddress = address !== legacyAddress;

  const qrCodePayload = `substrate:${address}:${selectedAccount.accountId}`;

  return (
    <Box padding={[4, 5, 6, 5]} horizontalAlign="center" gap={2}>
      <div className="w-full justify-items-center bg-main-app-background py-5">
        <QrTextGenerator className="mb-4" payload={qrCodePayload} />
      </div>
      <div className="flex w-full items-center justify-between bg-main-app-background px-5 py-3">
        <Address variant="truncate" address={address} title={resolvedName} />
        <Copy
          value={address}
          notification={t(assetTransactionUtils.getStatusTitle(isUnifiedAddress ? 'unified' : 'regular'))}
        >
          <Button variant="text" size="sm">
            {t('receive.copy')}
          </Button>
        </Copy>
      </div>
      {(chain.explorers || []).length > 0 && (
        <div className="flex w-full items-center justify-between bg-main-app-background px-5 py-3">
          <FootnoteText className="text-text-secondary">{t('receive.viewInExplorers')}</FootnoteText>
          <ul className="flex gap-x-2">
            {chain.explorers?.map(({ name, account }) => (
              <li aria-label={t('receive.explorerLinkLabel', { name })} key={name} className="flex">
                <a
                  href={account?.replace('{address}', address)}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="px-1.5 py-1"
                >
                  <Icon size={16} name={ExplorerIcons[name] || ExplorerIcons[DefaultExplorer]} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isUnifiedAddress && (
        <>
          <div className="mb-3 flex w-full items-center justify-between bg-main-app-background px-5 py-3">
            <FootnoteText className="text-text-secondary">{t('receive.exchangeAccount')}</FootnoteText>
            <Copy value={address} notification={t(assetTransactionUtils.getStatusTitle('unified'))}>
              <Button variant="text" size="sm">
                {t('receive.copyLegacyFormat')}
              </Button>
            </Copy>
          </div>

          <CompareAddressModal account={selectedAccount} chain={chain} asset={asset}>
            <Button variant="text" size="sm">
              {t('receive.compareAddressFormat')}
            </Button>
          </CompareAddressModal>
        </>
      )}
    </Box>
  );
};
