import { keyBy } from 'lodash';

import { accounts, multisigOperation, multisigOperationService } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';
import { multisigService } from '@/features/multisig-wallet';

export const $operationsByKey = multisigOperation.$list.map((operations) =>
  keyBy(operations, (op) =>
    multisigOperationService.getOperationId(op.chainId, op.callHash, op.multisigAccountId, op.blockCreated, op.indexCreated),
  ),
);

export const $multisigAccountsById = accounts.$list.map((accs) =>
  keyBy(accs.filter(accountUtils.isAnyMultisigAccount), (acc) => multisigService.getMultisigAccountId(acc)),
);
