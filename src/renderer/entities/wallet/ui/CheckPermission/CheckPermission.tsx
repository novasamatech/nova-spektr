import { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';

import type { Account_NEW, Wallet_NEW } from '@shared/core';
import { OperationType } from '../../common/types';
import { getOperationTypeFn } from '../../common/utils';

type Props = {
  operationType: OperationType;
  wallet?: Wallet_NEW;
  accounts: Account_NEW[];
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
