import { useGate, useUnit } from 'effector-react';
import { useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Box, Carousel, Modal } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { OperationResult } from '@/entities/transaction';
import { walletUtils } from '@/entities/wallet';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { votingFeatureStatus } from '../model/status';
import { votingModel } from '../model/voting';
import { votingStatusModel } from '../model/votingStatus';

import { VotingConfirmation } from './VotingConfirmation';

type Step = 'confirm' | 'sign' | 'submit' | 'basket';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  vote: 'aye' | 'nay' | null;
};

export const VotingModal = ({ isOpen, onClose, vote }: Props) => {
  useGate(votingModel.gate, { vote });

  const { t } = useI18n();
  const [step, setStep] = useState<Step>('confirm');

  const input = useUnit(votingFeatureStatus.input);
  const account = useUnit(votingStatusModel.$votingAccount);
  const member = useUnit(votingStatusModel.$currentMember);
  const fee = useUnit(votingModel.$fee);

  if (nullable(input) || nullable(member) || nullable(account) || nullable(vote)) {
    return null;
  }

  const wallet = walletUtils.getWalletFilteredAccounts(input.wallets, {
    accountFn: a => a.accountId === account.accountId,
  });

  const handleToggle = (open: boolean) => {
    if (!open) {
      setStep('confirm');
      onClose();
    }
  };

  const handleSign = () => {
    votingModel.sign();
    setStep('sign');
  };

  const handleBasketSave = () => {
    votingModel.saveToBasket();
    setStep('basket');
  };

  if (step === 'submit') {
    return <OperationSubmit isOpen={isOpen} onClose={onClose} />;
  }

  if (step === 'basket') {
    return (
      <OperationResult
        isOpen={isOpen}
        variant="success"
        autoCloseTimeout={2000}
        title={t('operation.addedToBasket')}
        onClose={onClose}
      />
    );
  }

  return (
    <Modal isOpen={isOpen} size="md" onToggle={handleToggle}>
      <Modal.Title close>
        <OperationTitle title={t('fellowship.voting.title')} chainId={input.chainId} />
      </Modal.Title>
      <Modal.Content>
        {nonNullable(account) ? (
          <Carousel item={step}>
            <Carousel.Item id="confirm" index={0}>
              <Box>
                <Box padding={[4, 5]}>
                  <VotingConfirmation
                    asset={input.asset}
                    chain={input.chain}
                    wallets={input.wallets}
                    account={account}
                    vote={vote}
                    rank={member.rank}
                    fee={fee}
                  />
                </Box>
                <Modal.Footer>
                  {wallet && basketUtils.isBasketAvailable(wallet) && (
                    <Button pallet="secondary" onClick={handleBasketSave}>
                      {t('operation.addToBasket')}
                    </Button>
                  )}
                  {nonNullable(wallet) && <SignButton type={wallet.type} onClick={handleSign} />}
                </Modal.Footer>
              </Box>
            </Carousel.Item>
            <Carousel.Item id="sign" index={1}>
              <OperationSign onGoBack={() => setStep('confirm')} />
            </Carousel.Item>
          </Carousel>
        ) : null}
      </Modal.Content>
    </Modal>
  );
};
