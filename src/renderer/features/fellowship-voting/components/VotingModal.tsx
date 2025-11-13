import { useGate, useUnit } from 'effector-react';
import { memo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Box, Carousel, Modal } from '@/shared/ui-kit';
import { referendumService } from '@/domains/collectives';
import { OperationTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { OperationResult } from '@/entities/transaction';
import { walletUtils } from '@/entities/wallet';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { fellowshipVotingFeature } from '../model/feature';
import { voting } from '../model/voting';
import { votingStatus } from '../model/votingStatus';

import { VotingConfirmation } from './VotingConfirmation';

type Step = 'confirm' | 'sign' | 'submit' | 'basket';

type Props = {
  isOpen: boolean;
  vote: 'aye' | 'nay' | null;
  onClose: () => void;
};

export const VotingModal = memo(({ isOpen, onClose, vote }: Props) => {
  useGate(voting.flow, { vote });

  const { t } = useI18n();
  const [step, setStep] = useState<Step>('confirm');

  const input = useUnit(fellowshipVotingFeature.input);
  const referendum = useUnit(votingStatus.$referendum);
  const maxRank = useUnit(votingStatus.$maxRank);
  const account = useUnit(votingStatus.$votingAccount);
  const member = useUnit(votingStatus.$currentMember);
  const memberTrack = useUnit(votingStatus.$memberTrack);
  const currentProposerTrack = useUnit(votingStatus.$currentProposerTrack);
  const nextProposerTrack = useUnit(votingStatus.$nextProposerTrack);
  const fee = useUnit(voting.$fee);

  if (
    nullable(input) ||
    nullable(member) ||
    nullable(account) ||
    nullable(vote) ||
    nullable(memberTrack) ||
    nullable(referendum) ||
    nullable(fee) ||
    referendumService.isCompleted(referendum)
  ) {
    return null;
  }

  const wallet = walletUtils.getWalletFilteredAccounts(input.wallets, {
    walletFn: w => w.id === account.walletId,
    accountFn: a => a.accountId === account.accountId,
  });

  const handleToggle = (open: boolean) => {
    if (!open) {
      setStep('confirm');
      onClose();
    }
  };

  const handleSign = () => {
    voting.sign();
    setStep('sign');
  };

  if (step === 'submit') {
    return <OperationSubmit isOpen={isOpen} onClose={() => handleToggle(false)} />;
  }

  if (step === 'basket') {
    return (
      <OperationResult
        isOpen={isOpen}
        variant="success"
        autoCloseTimeout={2000}
        title={t('operation.addedToBasket')}
        onClose={() => handleToggle(false)}
      />
    );
  }

  if (nullable(account)) {
    return (
      <OperationResult
        isOpen={isOpen}
        variant="error"
        autoCloseTimeout={2000}
        title={t('fellowship.voting.errors.noAccount')}
        onClose={() => handleToggle(false)}
      />
    );
  }

  return (
    <Modal isOpen={isOpen} size="md" onToggle={handleToggle}>
      <Modal.Title close>
        <OperationTitle title={t('fellowship.voting.title')} chainId={input.chainId} />
      </Modal.Title>
      <Modal.Content>
        <Carousel item={step}>
          <Carousel.Item id="confirm" index={0}>
            <Box padding={[4, 5]}>
              <VotingConfirmation
                asset={input.asset}
                chain={input.chain}
                wallets={input.wallets}
                account={account}
                vote={vote}
                rank={member.rank}
                memberTrack={memberTrack}
                currentProposerTrack={currentProposerTrack}
                nextProposerTrack={nextProposerTrack}
                referendum={referendum}
                maxRank={maxRank}
                fee={fee}
              />
            </Box>
            <Modal.Footer>{nonNullable(wallet) && <SignButton type={wallet.type} onClick={handleSign} />}</Modal.Footer>
          </Carousel.Item>
          <Carousel.Item id="sign" index={1}>
            <OperationSign onSuccess={() => setStep('submit')} onGoBack={() => setStep('confirm')} />
          </Carousel.Item>
        </Carousel>
      </Modal.Content>
    </Modal>
  );
});
