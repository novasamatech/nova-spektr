import { memo } from 'react';

import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { type MultisigOperation } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';
import { type TabFilter } from '../model/context';

import { OperationAdvancedDetails } from './OperationAdvancedDetails';
import { OperationDetails } from './OperationDetails';
import { OperationSignatories } from './OperationSignatories';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
  tab: TabFilter;
};

type SlotProps = {
  operation: MultisigOperation;
  showCoreTransaction?: boolean;
};

export const operationDetailsSlot = createSlot<SlotProps>();

export const OperationFullInfo = memo(({ operation, account, tab }: Props) => {
  const showCoreTransaction = accountUtils.isFlexibleMultisigAccount(account);

  return (
    <div className="grid grid-cols-3">
      <OperationDetails operation={operation}>
        <Slot id={operationDetailsSlot} props={{ operation, showCoreTransaction }} />
      </OperationDetails>

      {account && <OperationSignatories operation={operation} account={account} />}

      <OperationAdvancedDetails operation={operation} tab={tab} />
    </div>
  );
});
