import { PropsWithChildren } from 'react';

import { Account, Wallet } from '@shared/core';
import { OperationType } from '../../common/types';
import { getOperationTypeFn } from '../../common/utils';

type Props = {
  operationType: OperationType;
  wallet?: Wallet;
  accounts: Account[];
};

export const CheckPermission = ({ operationType, wallet, accounts, children }: PropsWithChildren<Props>) => {
  const operationFn = getOperationTypeFn(operationType);

  if (!wallet || !operationFn(wallet, accounts)) return null;

  return <>{children}</>;
};
