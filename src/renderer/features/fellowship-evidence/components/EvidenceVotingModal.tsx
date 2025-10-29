import { useGate, useUnit } from 'effector-react';
import { type PropsWithChildren, memo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Box, Carousel, Modal, Tooltip } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { OperationTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { evidenceVoting } from '../model/evidenceVoting';
import { fellowshipEvidenceFeature } from '../model/feature';

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
  const input = useUnit(fellowshipEvidenceFeature.input);
  const account = useUnit(evidenceVoting.$votingAccount);
  const votingMember = useUnit(evidenceVoting.$votingMember);
  const proposerMember = useUnit(evidenceVoting.$member);
  const wallet = useUnit(evidenceVoting.$wallet);
  const tracks = useUnit(evidenceVoting.$tracks);
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
    return (
      <>
        <OperationSubmit isOpen onClose={() => handleToggle(false)} />
        {children}
      </>
    );
  }

  if (nullable(account) || nullable(input)) {
    return (
      <>
        <OperationResult
          isOpen
          variant="error"
          autoCloseTimeout={2000}
          title={t('fellowship.voting.errors.noAccount')}
          onClose={() => handleToggle(false)}
        />
        {children}
      </>
    );
  }

  let title: string | null = null;

  if (evidence.wish === 'Retention') {
    if (currentTrack) {
      const rankId = currentTrack.id;
      title = t('fellowship.salary.submitEvidenceConfirm.retain', { rank: t(`fellowship.rank.${rankId}`) });
    }
  }

  if (evidence.wish === 'Promotion') {
    if (nextTrack) {
      const rankId = nextTrack.id;
      title = t('fellowship.salary.submitEvidenceConfirm.promote', { rank: t(`fellowship.rank.${rankId}`) });
    }
  }

  return (
    <Modal size="md" isOpen={open} onToggle={open => handleToggle(open)}>
      <Modal.Trigger>
        <div className="w-full">
          <Tooltip>
            <Tooltip.Trigger>
              <div className="w-full">{children}</div>
            </Tooltip.Trigger>
            <Tooltip.Content>{t('fellowship.voting.tooltip', { vote: aye ? 'Aye' : 'Nay' })}</Tooltip.Content>
          </Tooltip>
        </div>
      </Modal.Trigger>
      <Modal.Title close>{title && <OperationTitle title={title} chainId={input.chain.chainId} />}</Modal.Title>
      <Modal.Content>
        <Carousel item={step}>
          <Carousel.Item id="confirm" index={0}>
            <Box padding={[4, 5]}>
              {nonNullable(votingMember) && nonNullable(proposerMember) && nonNullable(fee) && (
                <EvidenceVotingConfirmation
                  evidence={evidence}
                  asset={input.asset}
                  chain={input.chain}
                  wallets={input.wallets}
                  tracks={tracks}
                  account={account}
                  vote={aye ? 'Aye' : 'Nay'}
                  maxRank={maxRank}
                  proposerMember={proposerMember}
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
