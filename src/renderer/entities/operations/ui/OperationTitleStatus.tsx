import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { type MultisigOperation, multisigOperationService } from '@/domains/network';

import { Status } from './Status';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount | null;
  /**
   * Layout override. Defaults to the fixed-width self-positioning wrapper used
   * by standalone consumers (dashboard queue); table rows pass `mx-0 w-auto`
   * because the column positions the pill.
   */
  className?: string;
};

export const OperationTitleStatus = ({ operation, account, className }: Props) => {
  return (
    <div className={cnTw('mx-3 flex w-[110px] shrink-0 justify-end', className)}>
      <Status
        status={operation.status}
        signed={multisigOperationService.getApprovalsCount(operation)}
        threshold={account?.threshold || 0}
      />
    </div>
  );
};
