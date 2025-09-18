import { type ReactNode, memo } from 'react';

import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { createTransformer, useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod } from '@/shared/lib/utils';
import { Accordion } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { OperationTitleDate, OperationTitleStatus } from '@/entities/operations';
import { TransactionTitle, findCoreTransaction } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';

import { OperationFullInfo } from './OperationFullInfo';
import { OperationIcon } from './OperationIcon';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
};

export const operationTitleTransformer = createTransformer<
  { operation: MultisigOperation; showCoreTransaction?: boolean },
  ReactNode
>();

export const Operation = memo(({ operation, account }: Props) => {
  const { t } = useI18n();

  const showCoreTransaction = accountUtils.isFlexibleMultisigAccount(account);
  const externalTitleNode = useTransformer(operationTitleTransformer, {
    operation,
    showCoreTransaction,
  });

  let titleNode;
  if (externalTitleNode) {
    titleNode = externalTitleNode;
  } else {
    const coreTx = findCoreTransaction(operation.transaction);

    const title =
      coreTx?.section && coreTx?.method
        ? formatSectionAndMethod(coreTx.section, coreTx.method)
        : t('operations.titles.unknown');
    titleNode = (
      <>
        <TransactionTitle className="flex-1" title={title} />
        <ChainTitle chainId={operation.chainId} className="w-[114px]" />
      </>
    );
  }

  return (
    <Accordion className="rounded bg-block-background-default transition-shadow hover:shadow-card-shadow focus-visible:shadow-card-shadow">
      <Accordion.Button buttonClass="px-2" iconWrapper="px-1.5">
        <div className="flex h-[52px] w-full items-center gap-4 overflow-hidden">
          <div className="flex w-full items-center gap-4 overflow-hidden">
            <OperationTitleDate operation={operation} />
            <OperationIcon operation={operation} account={account} />
            {titleNode}
          </div>
          <OperationTitleStatus operation={operation} account={account} />
        </div>
      </Accordion.Button>
      <Accordion.Content className="border-t border-divider">
        <OperationFullInfo operation={operation} account={account} />
      </Accordion.Content>
    </Accordion>
  );
});
