import { useGate, useUnit } from 'effector-react';
import { memo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Box, Carousel, Modal } from '@/shared/ui-kit';
import { type OngoingReferendum, useMaxRank } from '@/domains/collectives';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { OperationResult } from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { useFellowshipAccount, useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipAsset, useFellowshipChain } from '@/aggregates/fellowship-network';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { useTracks } from '../hooks/useTracks';
import { voting } from '../model/voting';

import { VotingConfirmation } from './VotingConfirmation';

type Step = 'confirm' | 'sign' | 'submit' | 'basket';

type Props = {
  isOpen: boolean;
  vote: 'aye' | 'nay' | null;
  onClose: () => void;
  referendum: OngoingReferendum;
};

export const VotingModal = memo(({ isOpen, onClose, vote, referendum }: Props) => {
  useGate(voting.flow, { referendum, vote });

  const { t } = useI18n();
  const [step, setStep] = useState<Step>('confirm');

  const wallets = useUnit(walletModel.$wallets);
  const chain = useFellowshipChain();
  const api = useFellowshipApi();
  const asset = useFellowshipAsset();

  const { data: maxRank } = useMaxRank({ palletType: 'fellowship', api });
  const { data: member } = useFellowshipMember();
  const { data: account } = useFellowshipAccount();

  const { memberTrack, currentProposerTrack, nextProposerTrack } = useTracks(referendum);
  const fee = useUnit(voting.$fee);

  if (
    nullable(chain) ||
    nullable(asset) ||
    nullable(member) ||
    nullable(account) ||
    nullable(vote) ||
    nullable(memberTrack) ||
    nullable(fee) ||
    nullable(maxRank)
  ) {
    return null;
  }

  const wallet = walletUtils.getWalletFilteredAccounts(wallets, {
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

  const handleBasketSave = () => {
    voting.saveToBasket();
    setStep('basket');
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
        <OperationTitle title={t('fellowship.voting.title')} chainId={chain.chainId} />
      </Modal.Title>
      <Modal.Content>
        <Carousel item={step}>
          <Carousel.Item id="confirm" index={0}>
            <Box padding={[4, 5]}>
              <VotingConfirmation
                asset={asset}
                chain={chain}
                wallets={wallets}
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
            <Modal.Footer>
              {wallet && basketUtils.isBasketAvailable(wallet) && (
                <Button pallet="secondary" onClick={handleBasketSave}>
                  {t('operation.addToBasket')}
                </Button>
              )}
              {nonNullable(wallet) && <SignButton type={wallet.type} onClick={handleSign} />}
            </Modal.Footer>
          </Carousel.Item>
          <Carousel.Item id="sign" index={1}>
            <OperationSign onSuccess={() => setStep('submit')} onGoBack={() => setStep('confirm')} />
          </Carousel.Item>
        </Carousel>
      </Modal.Content>
    </Modal>
  );
});
