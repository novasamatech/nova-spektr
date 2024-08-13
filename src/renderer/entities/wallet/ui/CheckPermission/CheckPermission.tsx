import { type PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';

import { type Wallet } from '@shared/core';
import { type OperationType } from '../../common/types';
import { getOperationTypeFn } from '../../common/utils';

type Props = {
  operationType: OperationType;
  wallet?: Wallet;
  redirectPath?: string;
};

export const CheckPermission = ({ operationType, wallet, redirectPath, children }: PropsWithChildren<Props>) => {
  if (!wallet) {
    return null;
  }

  if (getOperationTypeFn(operationType)(wallet)) {
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{children}</>;
  }

  return redirectPath ? <Navigate to={redirectPath} /> : null;
};
