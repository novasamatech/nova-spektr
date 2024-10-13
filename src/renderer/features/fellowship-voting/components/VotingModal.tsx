import { useUnit } from 'effector-react';
import { type PropsWithChildren, useState } from 'react';

import { useI18n } from '@app/providers';
import { Box, Carousel, Modal } from '@/shared/ui-kit';
import { nonNullable, nullable } from '@shared/lib/utils';
import { OperationTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { walletUtils } from '@entities/wallet';
import { votingFeatureStatus } from '../model/status';
import { votingModel } from '../model/voting';

import { VoteConfirm } from './VoteConfirm';

type Props = PropsWithChildren<{
  vote: 'aye' | 'nay';
}>;

export const VotingModal = ({ children, vote }: Props) => {
  const [step] = useState('confirm');
  const { t } = useI18n();

  const input = useUnit(votingFeatureStatus.input);
  const account = useUnit(votingModel.$votingAccount);
  const member = useUnit(votingModel.$currectMember);

  if (nullable(input) || nullable(member) || nullable(account)) {
    return null;
  }

  const wallet = walletUtils.getWalletFilteredAccounts(input.wallets, {
    accountFn: a => a.accountId === account.accountId,
  });

  return (
    <Modal size="md">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>
        <OperationTitle title={t('governance.voting.voteTitle')} chainId={input.chainId} />
      </Modal.Title>
      <Modal.Content>
        <Box gap={4} padding={[4, 5]}>
          {nonNullable(account) ? (
            <Carousel item={step}>
              <Carousel.Item id="confirm">
                <VoteConfirm
                  chain={input.chain}
                  wallets={input.wallets}
                  account={account}
                  vote={vote}
                  rank={member.rank}
                />
              </Carousel.Item>
              <Carousel.Item id="sign">
                <VoteConfirm
                  chain={input.chain}
                  wallets={input.wallets}
                  account={account}
                  vote={vote}
                  rank={member.rank}
                />
              </Carousel.Item>
            </Carousel>
          ) : null}
        </Box>
      </Modal.Content>
      <Modal.Footer>{step === 'confirm' && nonNullable(wallet) && <SignButton type={wallet.type} />}</Modal.Footer>
    </Modal>
  );
};
