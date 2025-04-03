import { useUnit } from 'effector-react';
import { memo } from 'react';

import { operationsContextModel } from '../model/context';

import { FlexibleMultisigShell } from './FlexibleMultisigShell';
import { OperationsList } from './OperationsList';

export const Operations = memo(() => {
  const account = useUnit(operationsContextModel.$account);
  const incompleteFlexibleMultisigTx = useUnit(operationsContextModel.$incompleteFlexibleMultisigTx);

  if (incompleteFlexibleMultisigTx && account) {
    return <FlexibleMultisigShell operation={incompleteFlexibleMultisigTx} account={account} />;
  }

  return <OperationsList />;
});
