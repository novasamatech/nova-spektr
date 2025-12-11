import { type BN } from '@polkadot/util';
import { memo, useMemo } from 'react';

import {
  type Asset,
  type AssetByChains,
  type ChainId,
  type FlexibleMultisigAccount,
  type MultisigAccount,
} from '@/shared/core';
import { createTransformer, useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod } from '@/shared/lib/utils';
import { Accordion } from '@/shared/ui';
import { IconButton } from '@/shared/ui/Buttons';
import { AssetBalance, AssetIcon } from '@/shared/ui-entities';
import { Box, Copy, Tooltip } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/network';
import { ChainTitle, XcmChains } from '@/entities/chain';
import { OperationTitleDate, OperationTitleStatus } from '@/entities/operations';
import {
  TransactionTitle,
  findCoreTransaction,
  getTransactionAmount,
  useTransactionAsset,
} from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { deepLinkModel } from '../model/deep-link';

import { OperationFullInfo } from './OperationFullInfo';
import { OperationIcon } from './OperationIcon';

type Props = {
  operation: MultisigOperation;
  multisigAccount: MultisigAccount | FlexibleMultisigAccount;
  isDefaultOpen?: boolean;
};

export type OperationTitle = {
  title?: string;
  amount?: {
    value: BN | string;
    asset: Asset | AssetByChains;
  };
  sourceChainId?: ChainId;
  destinationChainId?: ChainId; // For XCM transactions
};

export const operationTitleTransformer = createTransformer<
  { operation?: MultisigOperation; showCoreTransaction?: boolean },
  OperationTitle
>();

export const Operation = memo(({ operation, multisigAccount, isDefaultOpen = false }: Props) => {
  const { t } = useI18n();

  const showCoreTransaction = accountUtils.isFlexibleMultisigAccount(multisigAccount);
  const coreTx = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
  const asset = useTransactionAsset(coreTx, operation.chainId);

  const deepLink = useMemo(
    () => deepLinkModel.generateMultisigOperationDeepLink(operation, multisigAccount),
    [operation, multisigAccount],
  );

  const externalTitle = useTransformer(operationTitleTransformer, {
    operation,
    showCoreTransaction,
  });

  console.log({ externalTitle, operation });

  let titleData: OperationTitle;
  if (externalTitle) {
    titleData = externalTitle;
  } else {
    const amount = coreTx ? getTransactionAmount(coreTx) : null;

    titleData = {
      title:
        coreTx?.section && coreTx?.method
          ? formatSectionAndMethod(coreTx.section, coreTx.method)
          : t('operations.titles.unknown'),
      amount: asset && amount ? { value: amount, asset } : undefined,
      sourceChainId: operation.chainId,
    };
  }

  return (
    <Accordion
      isDefaultOpen={isDefaultOpen}
      className="rounded bg-block-background-default transition-shadow hover:shadow-card-shadow focus-visible:shadow-card-shadow"
    >
      <Accordion.Button buttonClass="px-2" iconWrapper="px-1.5">
        <div className="flex h-[52px] w-full items-center overflow-hidden">
          <div className="flex w-full items-center gap-x-2 overflow-hidden">
            <OperationTitleDate operation={operation} />
            <OperationIcon operation={operation} account={multisigAccount} />
            {titleData.title && <TransactionTitle className="flex-1" title={titleData.title} />}
            {titleData.amount && (
              <Box width="160px" direction="row" gap={2} verticalAlign="center">
                <AssetIcon asset={titleData.amount.asset} size={32} />
                <AssetBalance value={titleData.amount.value} asset={titleData.amount.asset} />
              </Box>
            )}
            {titleData.sourceChainId &&
              (titleData.destinationChainId ? (
                <XcmChains
                  chainIdFrom={titleData.sourceChainId}
                  chainIdTo={titleData.destinationChainId}
                  className="w-[114px]"
                />
              ) : (
                <ChainTitle chainId={titleData.sourceChainId} className="w-[114px]" />
              ))}
          </div>

          <OperationTitleStatus operation={operation} account={multisigAccount} />

          <Tooltip>
            <Tooltip.Trigger>
              <Copy value={deepLink} notification={t('general.notifications.operationLinkCopied')}>
                <IconButton className="shrink-0 self-center text-icon-default" name="share" />
              </Copy>
            </Tooltip.Trigger>
            <Tooltip.Content>{t('operations.shareOperationTooltip')}</Tooltip.Content>
          </Tooltip>
        </div>
      </Accordion.Button>
      <Accordion.Content className="border-t border-divider">
        <OperationFullInfo operation={operation} account={multisigAccount} />
      </Accordion.Content>
    </Accordion>
  );
});
