import { type ReactNode, memo, useMemo } from 'react';

import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { createTransformer, useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod } from '@/shared/lib/utils';
import { Accordion } from '@/shared/ui';
import { IconButton } from '@/shared/ui/Buttons';
import { AssetBalance, AssetIcon } from '@/shared/ui-entities';
import { Box, Copy } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
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

export const operationTitleTransformer = createTransformer<
  { operation: MultisigOperation; showCoreTransaction?: boolean },
  ReactNode
>();

export const Operation = memo(({ operation, multisigAccount, isDefaultOpen = false }: Props) => {
  const { t } = useI18n();

  const showCoreTransaction = accountUtils.isFlexibleMultisigAccount(multisigAccount);
  const coreTx = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
  const asset = useTransactionAsset(coreTx, operation.chainId);

  const deepLink = useMemo(() => deepLinkModel.generateMultisigOperationDeepLink(operation), [operation]);

  const externalTitleNode = useTransformer(operationTitleTransformer, {
    operation,
    showCoreTransaction,
  });

  let titleNode;
  if (externalTitleNode) {
    titleNode = externalTitleNode;
  } else {
    const amount = coreTx ? getTransactionAmount(coreTx) : null;

    const title =
      coreTx?.section && coreTx?.method
        ? formatSectionAndMethod(coreTx.section, coreTx.method)
        : t('operations.titles.unknown');
    titleNode = (
      <>
        <TransactionTitle className="flex-1" title={title} />

        {asset && amount && (
          <Box width="160px" direction="row" gap={2} verticalAlign="center">
            <AssetIcon asset={asset} size={32} />
            <AssetBalance value={amount} asset={asset} />
          </Box>
        )}

        <ChainTitle chainId={operation.chainId} className="w-[114px]" />
      </>
    );
  }

  return (
    <Accordion
      isDefaultOpen={isDefaultOpen}
      className="rounded bg-block-background-default transition-shadow hover:shadow-card-shadow focus-visible:shadow-card-shadow"
    >
      <Accordion.Button buttonClass="px-2" iconWrapper="px-1.5">
        <div className="flex h-[52px] w-full items-center gap-4 overflow-hidden">
          <div className="flex w-full items-center gap-4 overflow-hidden">
            <OperationTitleDate operation={operation} />
            <OperationIcon operation={operation} account={multisigAccount} />
            {titleNode}
          </div>

          <OperationTitleStatus operation={operation} account={multisigAccount} />

          <Copy value={deepLink} notification={t('general.notifications.operationLinkCopied')}>
            <IconButton className="shrink-0 self-center text-icon-default" name="share" />
          </Copy>
        </div>
      </Accordion.Button>
      <Accordion.Content className="border-t border-divider">
        <OperationFullInfo operation={operation} account={multisigAccount} />
      </Accordion.Content>
    </Accordion>
  );
});
