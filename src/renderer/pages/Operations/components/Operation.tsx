import { type FlexibleMultisigTransactionDS, type MultisigTransactionDS } from '@/shared/api/storage';
import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { useSlot } from '@/shared/di';
import { Accordion } from '@/shared/ui';
import { multisigOperationsFeature } from '@/features/multisig-operations';

import { OperationFullInfo } from './OperationFullInfo';

type Props = {
  tx: MultisigTransactionDS | FlexibleMultisigTransactionDS;
  account?: MultisigAccount | FlexibleMultisigAccount;
};

const Operation = ({ tx, account }: Props) => {
  const operationTitle = useSlot(multisigOperationsFeature.slots.operationTitle, {
    props: {
      operation: tx,
    },
  });

  return (
    <Accordion className="rounded bg-block-background-default transition-shadow hover:shadow-card-shadow focus-visible:shadow-card-shadow">
      <Accordion.Button buttonClass="px-2" iconWrapper="px-1.5">
        <div className="flex h-[52px] w-full items-center gap-x-4 overflow-hidden">{operationTitle}</div>
      </Accordion.Button>
      <Accordion.Content className="border-t border-divider">
        <OperationFullInfo tx={tx} account={account} />
      </Accordion.Content>
    </Accordion>
  );
};

export default Operation;
