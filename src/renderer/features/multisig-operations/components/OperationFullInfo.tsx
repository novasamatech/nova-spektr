import { memo } from 'react';

import { type FlexibleMultisigAccount, type MultisigAccount, type Wallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { type MultisigOperation } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';
import { type OperationAmountValue } from '../lib/types';

import { OperationAdvancedDetails } from './OperationAdvancedDetails';
import { OperationDetails } from './OperationDetails';
import { OperationSignatories } from './OperationSignatories';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
  /** The wallet owning `account`, as the row's Submitter cell resolves it. */
  wallet?: Wallet;
  /** Amount shown in the row's Value cell, repeated in the Details column. */
  amount?: OperationAmountValue;
  /**
   * Shareable deep link to this operation, surfaced by the Signatories header's
   * Share action.
   */
  deepLink: string;
};

type SlotProps = {
  operation: MultisigOperation;
  showCoreTransaction?: boolean;
};

export const operationDetailsSlot = createSlot<SlotProps>();

export const OperationFullInfo = memo(({ operation, account, wallet, amount, deepLink }: Props) => {
  const showCoreTransaction = accountUtils.isFlexibleMultisigAccount(account);

  return (
    <div className="grid grid-cols-3">
      <OperationDetails operation={operation} account={account} wallet={wallet} amount={amount}>
        <Slot id={operationDetailsSlot} props={{ operation, showCoreTransaction }} />
      </OperationDetails>

      {account && <OperationSignatories operation={operation} account={account} deepLink={deepLink} />}

      <OperationAdvancedDetails operation={operation} />
    </div>
  );
});
