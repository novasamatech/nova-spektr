import { useGate, useUnit } from 'effector-react';
import { useState } from 'react';

import { useI18n } from '@/app/providers';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Box, Carousel, Modal } from '@/shared/ui-kit';
import { OperationTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { walletUtils } from '@/entities/wallet';
import { basketUtils } from '@/features/operations/OperationsConfirm';
import { OperationSign } from '@features/operations';
import { votingFeatureStatus } from '../model/status';
import { votingModel } from '../model/voting';
import { votingStatusModel } from '../model/votingStatus';

import { VotingConfirmation } from './VotingConfirmation';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  vote: 'aye' | 'nay' | null;
};

export const VotingModal = ({ isOpen, onClose, vote }: Props) => {
  useGate(votingModel.gate, { vote });

  const { t } = useI18n();
  const [step, setStep] = useState('confirm');

  const input = useUnit(votingFeatureStatus.input);
  const account = useUnit(votingStatusModel.$votingAccount);
  const member = useUnit(votingStatusModel.$currectMember);
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

  return (
    <Modal isOpen={isOpen} size="md" onToggle={handleToggle}>
      <Modal.Title close>
        <OperationTitle title={t('governance.voting.voteTitle')} chainId={input.chainId} />
      </Modal.Title>
      <Modal.Content>
        {nonNullable(account) ? (
          <Carousel item={step}>
            <Carousel.Item id="confirm">
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
                    <Button pallet="secondary" onClick={() => console.log('aaa')}>
                      {t('operation.addToBasket')}
                    </Button>
                  )}
                  {nonNullable(wallet) && (
                    <SignButton
                      type={wallet.type}
                      onClick={() => {
                        votingModel.sign();
                        setStep('sign');
                      }}
                    />
                  )}
                </Modal.Footer>
              </Box>
            </Carousel.Item>
            <Carousel.Item id="sign">
              <OperationSign onGoBack={() => setStep('confirm')} />
            </Carousel.Item>
          </Carousel>
        ) : null}
      </Modal.Content>
    </Modal>
  );
};
