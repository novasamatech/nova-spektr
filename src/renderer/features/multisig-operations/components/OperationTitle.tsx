import { memo } from 'react';

import { Slot, createSlot, createTransformer, useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod } from '@/shared/lib/utils';
import { type IconNames } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/network';
import { TransactionTitle } from '@/entities/transaction';

type Props = {
  operation: MultisigOperation;
  variant: 'long' | 'short';
};

export const operationIconNameTransformer = createTransformer<{ operation: MultisigOperation }, IconNames>();
export const operationTitleTransformer = createTransformer<{ operation: MultisigOperation }, string>();
export const operationAdditionalInfoSlot = createSlot<{ operation: MultisigOperation }>();

export const OperationTitle = memo(({ operation, variant }: Props) => {
  const { t } = useI18n();
  const iconName = useTransformer(operationIconNameTransformer, { operation });
  const externalTitle = useTransformer(operationTitleTransformer, { operation });
  // const apis = useUnit(networkModel.$apis);
  // const api = apis[operation.chainId];

  const methodTitle =
    operation.section && operation.method ? formatSectionAndMethod(operation.section, operation.method) : null;

  const title = externalTitle ? t(externalTitle) : (methodTitle ?? t('operations.titles.unknown'));

  return (
    <Box verticalAlign="center" width="100%">
      <Box direction="row" verticalAlign="center" gap={3}>
        <TransactionTitle className="flex-1 overflow-hidden" title={title} icon={iconName ?? 'unknownMst'} />
        {variant === 'long' && <Slot id={operationAdditionalInfoSlot} props={{ operation }} />}
      </Box>
      <span className="hidden [*:empty~&]:flex">{methodTitle}</span>
    </Box>
  );
});
