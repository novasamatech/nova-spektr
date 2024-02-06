import { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';

import type { Account, Wallet } from '@shared/core';
import { OperationType } from '../../common/types';
import { getOperationTypeFn } from '../../common/utils';

type Props = {
  operationType: OperationType;
  wallet?: Wallet;
  accounts: Account[];
  redirectPath?: string;
};

export const CheckPermission = ({
  operationType,
  wallet,
  accounts,
  redirectPath,
  children,
}: PropsWithChildren<Props>) => {
  if (!wallet) return null;

  if (getOperationTypeFn(operationType)(wallet, accounts)) {
    return <>{children}</>;
  }

  return redirectPath ? <Navigate to={redirectPath} /> : null;
};
