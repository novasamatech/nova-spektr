import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { useI18n } from '@app/providers';
import { Box, Modal } from '@/shared/ui-kit';
import { nonNullable, nullable } from '@shared/lib/utils';
import { Button } from '@shared/ui';
import { OperationTitle } from '@/entities/chain';
import { votingFeatureStatus } from '../model/status';
import { votingModel } from '../model/voting';

import { VoteConfirm } from './VoteConfirm';

type Props = PropsWithChildren<{
  vote: 'aye' | 'nay';
}>;

export const VotingModal = ({ children, vote }: Props) => {
  const { t } = useI18n();

  const input = useUnit(votingFeatureStatus.input);
  const account = useUnit(votingModel.$votingAccount);
  const member = useUnit(votingModel.$currectMember);

  if (nullable(input) || nullable(member)) {
    return null;
  }

  return (
    <Modal size="md">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>
        <OperationTitle title={t('governance.voting.voteTitle')} chainId={input.chainId} />
      </Modal.Title>
      <Modal.Content>
        <Box gap={4} padding={[4, 5]}>
          {nonNullable(account) ? (
            <VoteConfirm chain={input.chain} wallets={input.wallets} account={account} vote={vote} rank={member.rank} />
          ) : null}
        </Box>
      </Modal.Content>
      <Modal.Footer>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <Button>Sign</Button>
      </Modal.Footer>
    </Modal>
  );
};
