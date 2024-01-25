import { PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';

import { Account, Wallet } from '../../../core';
import { OperationType } from '../common/types';
import { getOperationTypeFn } from '../common/utils';

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
}: PropsWithChildren<Props>): JSX.Element => {
  const navigate = useNavigate();

  const operationFn = getOperationTypeFn(operationType);

  if (wallet && operationFn(wallet, accounts)) {
    return <>{children}</>;
  } else {
    navigate(redirectPath);
  }

  return <></>;
};
