import { type ReactNode, memo } from 'react';

import { type MultisigAccount } from '@/shared/core';
import { createTransformer, useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod } from '@/shared/lib/utils';
import { Accordion } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/network';
import { OperationTitleDate, OperationTitleStatus } from '@/entities/operations';
import { TransactionTitle } from '@/entities/transaction';

import { OperationFullInfo } from './OperationFullInfo';
import { OperationIcon } from './OperationIcon';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | null;
};

export const operationTitleTransformer = createTransformer<{ operation: MultisigOperation }, ReactNode>();

export const Operation = memo(({ operation, account }: Props) => {
  const { t } = useI18n();
  const titleNode = useTransformer(operationTitleTransformer, { operation });
  let title;

  if (titleNode) {
    title = titleNode;
  } else {
    if (operation.section && operation.method) {
      const formattedMethod = formatSectionAndMethod(operation.section, operation.method);
      title = <TransactionTitle title={formattedMethod} />;
    } else {
      title = <TransactionTitle title={t('operations.titles.unknown')} />;
    }
  }

  return (
    <Accordion className="rounded bg-block-background-default transition-shadow hover:shadow-card-shadow focus-visible:shadow-card-shadow">
      <Accordion.Button buttonClass="px-2" iconWrapper="px-1.5">
        <div className="flex h-[52px] w-full items-center gap-4 overflow-hidden">
          <div className="flex w-full items-center gap-4 overflow-hidden">
            <OperationTitleDate operation={operation} />
            <OperationIcon operation={operation} />
            {title}
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
