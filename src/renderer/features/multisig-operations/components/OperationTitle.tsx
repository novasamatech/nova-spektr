import { memo } from 'react';

import { type ChainId } from '@/shared/core';
import { Slot, createSlot, createTransformer, useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod } from '@/shared/lib/utils';
import { type IconNames } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type AnyDecodedTransaction, type MultisigOperation } from '@/domains/network';
import { TransactionTitle } from '@/entities/transaction';

type Props = {
  operation: MultisigOperation;
  variant: 'long' | 'short';
};

type InjectProps = {
  transaction: AnyDecodedTransaction | null;
  section: string | null;
  method: string | null;
  chainId: ChainId;
};

export const operationIconNameTransformer = createTransformer<InjectProps, IconNames>();
export const operationTitleTransformer = createTransformer<InjectProps, string>();
export const operationAdditionalInfoSlot = createSlot<InjectProps>();

export const OperationTitle = memo(({ operation, variant }: Props) => {
  const { t } = useI18n();
  const injectProps: InjectProps = {
    transaction: operation.transaction,
    section: operation.section,
    method: operation.method,
    chainId: operation.chainId,
  };
  const iconName = useTransformer(operationIconNameTransformer, injectProps);
  const externalTitle = useTransformer(operationTitleTransformer, injectProps);
  // const apis = useUnit(networkModel.$apis);
  // const api = apis[operation.chainId];

  const methodTitle =
    operation.section && operation.method ? formatSectionAndMethod(operation.section, operation.method) : null;

  const title = externalTitle ? t(externalTitle) : (methodTitle ?? t('operations.titles.unknown'));

  return (
    <Box verticalAlign="center" width="100%">
      <Box direction="row" verticalAlign="center" gap={3}>
        <TransactionTitle className="flex-1 overflow-hidden" title={title} icon={iconName ?? 'unknownMst'} />
        {variant === 'long' && <Slot id={operationAdditionalInfoSlot} props={injectProps} />}
      </Box>
      <span className="hidden [*:empty~&]:flex">{methodTitle}</span>
    </Box>
  );
});
