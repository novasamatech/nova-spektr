import { useGate, useUnit } from 'effector-react';
import { type PropsWithChildren, memo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Box, Carousel, Modal } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { OperationTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { evidenceVoting } from '../model/evidenceVoting';
import { fellowshipSalaryFeature } from '../model/feature';

import { EvidenceVotingConfirmation } from './EvidenceVotingConfirmation';

type Step = 'confirm' | 'sign' | 'submit';

type Props = PropsWithChildren<{
  evidence: Evidence;
  aye: boolean;
}>;

export const EvidenceVotingModal = memo(({ evidence, aye, children }: Props) => {
  useGate(evidenceVoting.flow, { evidence, aye });

  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('confirm');
  const input = useUnit(fellowshipSalaryFeature.input);
  const account = useUnit(evidenceVoting.$votingAccount);
  const votingMember = useUnit(evidenceVoting.$votingMember);
  const wallet = useUnit(evidenceVoting.$wallet);
  const currentTrack = useUnit(evidenceVoting.$currentTrack);
  const nextTrack = useUnit(evidenceVoting.$nextTrack);
  const maxRank = useUnit(evidenceVoting.$maxRank);
  const fee = useUnit(evidenceVoting.$fee);

  const handleToggle = (open: boolean) => {
    if (open) {
      evidenceVoting.flow.open({ evidence, aye });
    } else {
      evidenceVoting.flow.close({ evidence, aye });
    }
    setOpen(open);
    setStep('confirm');
  };

  const handleSign = () => {
    evidenceVoting.sign();
    setStep('sign');
  };

  if (step === 'submit') {
    return <OperationSubmit isOpen onClose={() => handleToggle(false)} />;
  }

  if (nullable(account) || nullable(input)) {
    return (
      <OperationResult
        isOpen
        variant="error"
        autoCloseTimeout={2000}
        title={t('fellowship.voting.errors.noAccount')}
        onClose={() => handleToggle(false)}
      />
    );
  }

  return (
    <Modal size="md" isOpen={open} onToggle={open => handleToggle(open)}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>
        <OperationTitle title={t('fellowship.salary.promotionTitle')} chainId={input.chain.chainId} />
      </Modal.Title>
      <Modal.Content>
        <Carousel item={step}>
          <Carousel.Item id="confirm" index={0}>
            <Box padding={[4, 5]}>
              {nonNullable(votingMember) && (
                <EvidenceVotingConfirmation
                  evidence={evidence}
                  asset={input.asset}
                  chain={input.chain}
                  wallets={input.wallets}
                  currentTrack={currentTrack}
                  nextTrack={nextTrack}
                  account={account}
                  vote={aye ? 'Aye' : 'Nay'}
                  maxRank={maxRank}
                  votingMember={votingMember}
                  fee={fee}
                />
              )}
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
