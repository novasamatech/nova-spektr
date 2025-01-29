import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { formatBalance, getRelativeTimeFromApi, nonNullable } from '@/shared/lib/utils';
import { Button, DetailRow, Duration, HelpText, SmallTitleText } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { fellowshipSalaryFeature } from '../model/feature';
import { member } from '../model/member';
import { memberSalary } from '../model/memberSalary';

export const SalaryTab = memo(() => {
  const [timeLeft, setTimeLeft] = useState(0);

  const input = useUnit(fellowshipSalaryFeature.input);
  const currentMember = useUnit(member.$member);
  const identity = useUnit(member.$identity);
  const currentPeriod = useUnit(memberSalary.$currentPeriod);
  const salary = useUnit(memberSalary.$memberSalary);

  useEffect(() => {
    if (input?.api && currentPeriod && currentPeriod.type !== 'unknown') {
      getRelativeTimeFromApi(currentPeriod.left, input.api).then(setTimeLeft);
    }
  }, [input?.api, currentPeriod]);

  return (
    <Box padding={[4, 5]} gap={6}>
      <Box gap={2}>
        <HelpText className="text-text-secondary">Beneficiary</HelpText>

        <Box width="60%">
          {nonNullable(currentMember) && nonNullable(input?.chain) && (
            <Account iconSize={28} title={identity?.name} accountId={currentMember.accountId} chain={input.chain} />
          )}
        </Box>
      </Box>
      <Box>
        {currentPeriod?.type === 'registration' && (
          <div className="flex flex-col items-start gap-4 rounded-lg border p-4">
            {nonNullable(salary) && (
              <DetailRow
                label={`Request a ${formatBalance(salary.active, 6, { K: true }).formatted} USDT salary within:`}
              >
                <SmallTitleText>
                  <Duration seconds={timeLeft / 1000} />
                </SmallTitleText>
              </DetailRow>
            )}
            <Button variant="fill">Request</Button>
          </div>
        )}
        {currentPeriod?.type === 'payout' && (
          <div className="flex flex-col items-start gap-4 rounded-lg border p-4">
            <DetailRow label="Payout a salary within:">
              <SmallTitleText>
                <Duration seconds={timeLeft / 1000} />
              </SmallTitleText>
            </DetailRow>
            <Button variant="fill">Payout</Button>
          </div>
        )}
      </Box>
    </Box>
  );
});
