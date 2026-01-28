import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { createTransformer, useTransformer } from '@/shared/di';
import { cnTw } from '@/shared/lib/utils';
import { type IconNames, Icon } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

export const operationIconTransformer = createTransformer<
  { operation: MultisigOperation; showCoreTransaction?: boolean },
  IconNames
>();

const StatusBackground: Record<MultisigOperation['status'], string> = {
  pending: 'bg-icon-warning',
  executed: 'bg-icon-positive',
  cancelled: 'bg-icon-negative',
  error: 'bg-icon-negative',
};

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
};

export const OperationIcon = ({ operation, account }: Props) => {
  const showCoreTransaction = accountUtils.isFlexibleMultisigAccount(account);
  const icon = useTransformer(operationIconTransformer, { operation, showCoreTransaction });

  return (
    <div
      className={cnTw(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
        StatusBackground[operation.status],
      )}
    >
      <Icon name={icon || 'unknownMst'} size={20} className="text-white" />
    </div>
  );
};
