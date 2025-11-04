import { useUnit } from 'effector-react';

import { nonNullable } from '@/shared/lib/utils';
import { evidenceService, memberService, salaryService, votingService } from '@/domains/collectives';
import { type BasketTransaction, basketOperations } from '@/aggregates/basket-operations';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { type OperationType } from '../types';

export const useMemberBasketOperations = () => {
  const operations = useUnit(basketOperations.$list);
  const { data: member, pending } = useFellowshipMember();

  const filteredOperations = nonNullable(member)
    ? operations.filter(operation => operation.coreTx.accountId === member.accountId)
    : [];

  const map: Partial<Record<OperationType, BasketTransaction>> = {};

  for (const operation of filteredOperations) {
    if (memberService.isSetActiveTransaction(operation.coreTx)) {
      map['set_active'] = operation;
    }

    if (salaryService.isSalaryInductTransaction(operation.coreTx)) {
      map['salary_induct'] = operation;
    }

    if (salaryService.isSalaryRequestTransaction(operation.coreTx)) {
      map['salary_request'] = operation;
    }

    if (salaryService.isSalaryPayoutTransaction(operation.coreTx)) {
      map['salary_payout'] = operation;
    }

    if (evidenceService.isEvidenceTransaction(operation.coreTx)) {
      map['evidence'] = operation;
    }

    if (votingService.isVotingTransaction(operation.coreTx)) {
      map[`referendum_${operation.coreTx.args.poll}`] = operation;
    }
  }

  return { data: map, pending };
};
