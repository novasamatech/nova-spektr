import { Trans } from 'react-i18next';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type MultisigOperation } from '@/domains/network';
import { NamedAccount } from '@/widgets/NameResolver';

type Props = {
  operation: MultisigOperation;
  chain: Chain | undefined;
};

/**
 * "Multisig is not in the address book" message with the multisig account
 * inlined. Shared between the row description cell (tooltip) and the Details
 * panel (alert box).
 */
export const DescriptionNotInBookMessage = ({ operation, chain }: Props) => {
  const { t } = useI18n();

  return (
    <Trans
      t={t}
      i18nKey="operation.descriptionMultisigNotInBook"
      components={{
        account: <NamedAccount accountId={operation.multisigAccountId} chain={chain} variant="short" hideExplorers />,
      }}
    />
  );
};
