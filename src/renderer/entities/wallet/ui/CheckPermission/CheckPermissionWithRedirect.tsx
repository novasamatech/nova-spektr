import { PropsWithChildren, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Account, Wallet } from '@shared/core';
import { OperationType } from '../../common/types';
import { getOperationTypeFn } from '../../common/utils';

type Props = {
  operationType: OperationType;
  wallet?: Wallet;
  accounts: Account[];
  redirectPath: string;
};

export const CheckPermissionWithRedirect = ({
  operationType,
  wallet,
  accounts,
  children,
  redirectPath,
}: PropsWithChildren<Props>): ReactNode => {
  const navigate = useNavigate();

  const operationFn = getOperationTypeFn(operationType);

  useEffect(() => {
    if (wallet && !operationFn(wallet, accounts)) {
      navigate(redirectPath);
    }
  }, []);

  return children;
};
