import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { createTransformer, useTransformer } from '@/shared/di';
import { Icon, type IconNames } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

export const operationIconTransformer = createTransformer<
  { operation: MultisigOperation; showCoreTransaction?: boolean },
  IconNames
>();

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
};

export const OperationIcon = ({ operation, account }: Props) => {
  const showCoreTransaction = accountUtils.isFlexibleMultisigAccount(account);
  const icon = useTransformer(operationIconTransformer, { operation, showCoreTransaction });

  return (
    <div className="box-content flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-token-container-border">
      <Icon name={icon || 'unknownMst'} size={20} />
    </div>
  );
};
