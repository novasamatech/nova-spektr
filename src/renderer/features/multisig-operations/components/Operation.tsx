import { type ReactNode, memo } from 'react';

import { type MultisigAccount } from '@/shared/core';
import { createTransformer, useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod } from '@/shared/lib/utils';
import { Accordion } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { OperationTitleDate, OperationTitleStatus } from '@/entities/operations';
import { TransactionTitle } from '@/entities/transaction';

import { OperationFullInfo } from './OperationFullInfo';
import { OperationIcon } from './OperationIcon';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount;
};

export const operationTitleTransformer = createTransformer<{ operation: MultisigOperation }, ReactNode>();

export const Operation = memo(({ operation, account }: Props) => {
  const { t } = useI18n();
  const externalTitleNode = useTransformer(operationTitleTransformer, { operation });
  let titleNode;

  if (externalTitleNode) {
    titleNode = externalTitleNode;
  } else {
    const title =
      operation.section && operation.method
        ? formatSectionAndMethod(operation.section, operation.method)
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
            <OperationIcon operation={operation} />
            {titleNode}
          </div>
          <OperationTitleStatus operation={operation} />
        </div>
      </Accordion.Button>
      <Accordion.Content className="border-t border-divider">
        <OperationFullInfo operation={operation} account={account} />
      </Accordion.Content>
    </Accordion>
  );
});
