import { useUnit } from 'effector-react';
import { useState } from 'react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { copyToClipboard, toAddress } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon } from '@/shared/ui';
import { DefaultExplorer, ExplorerIcons } from '@/shared/ui/ExplorerLink/constants';
import { Account } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { OperationResult, QrTextGenerator } from '@/entities/transaction';
import { type StatusType } from '../lib/types';
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
  const [statusType, setStatusType] = useState<StatusType | null>(null);

  if (!selectedAccount) return null;

  const address = toAddress(selectedAccount.accountId, { prefix: chain.addressPrefix });
  const legacyAddress = toAddress(selectedAccount.accountId, {
    prefix: chain.legacyAddressPrefix ?? chain.addressPrefix,
  });
  const isUnifiedAddress = address !== legacyAddress;

  const handleCopy = (address: string, type: StatusType) => {
    copyToClipboard(address);
    setStatusType(type);
  };

  //eslint-disable-next-line i18next/no-literal-string
  const qrCodePayload = `substrate:${address}:${selectedAccount.accountId}`;

  return (
    <Box padding={[4, 5, 6, 5]} horizontalAlign="center" gap={2}>
      <div className="bg-main-app-background w-full justify-items-center py-5">
        <QrTextGenerator skipEncoding className="mb-4" payload={qrCodePayload} size={240} />
      </div>
      <div className="bg-main-app-background flex w-full items-center justify-between px-5 py-3">
        <Account
          variant="truncate"
          accountId={selectedAccount.accountId}
          chain={chain}
          title={selectedAccount.name}
          hideExplorers
        />
        <Button variant="text" size="sm" onClick={() => handleCopy(address, isUnifiedAddress ? 'unified' : 'regular')}>
          {t('receive.copy')}
        </Button>
      </div>
      {(chain.explorers || []).length > 0 && (
        <div className="bg-main-app-background flex w-full items-center justify-between px-5 py-3">
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
          <div className="bg-main-app-background mb-3 flex w-full items-center justify-between px-5 py-3">
            <FootnoteText className="text-text-secondary">{t('receive.exchangeAccount')}</FootnoteText>
            <Button variant="text" size="sm" onClick={() => handleCopy(legacyAddress, 'legacy')}>
              {t('receive.copyLegacyFormat')}
            </Button>
          </div>

          <CompareAddressModal account={selectedAccount} chain={chain} asset={asset}>
            <Button variant="text" size="sm">
              {t('receive.compareAddressFormat')}
            </Button>
          </CompareAddressModal>
        </>
      )}

      <OperationResult
        autoCloseTimeout={2000}
        isOpen={Boolean(statusType)}
        content={<Icon size={40} name="checkmarkOutline" className="text-icon-positive m-4" />}
        title={t(assetTransactionUtils.getStatusTitle(statusType))}
        onClose={() => setStatusType(null)}
      />
    </Box>
  );
};
