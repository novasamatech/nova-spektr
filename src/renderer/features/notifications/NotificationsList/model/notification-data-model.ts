import { keyBy } from 'lodash';

import { accounts, multisigOperation, multisigOperationService } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

export const $operationsByKey = multisigOperation.$list.map((operations) =>
  keyBy(operations, (op) =>
    multisigOperationService.getOperationId(
      op.chainId,
      op.callHash,
      op.multisigAccountId,
      op.blockCreated,
      op.indexCreated,
    ),
  ),
);

export const $multisigAccounts = accounts.$list.map((accs) => accs.filter(accountUtils.isAnyMultisigAccount));
