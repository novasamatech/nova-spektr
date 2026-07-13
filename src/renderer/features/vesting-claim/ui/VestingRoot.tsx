import { useUnit } from 'effector-react';
import { useCallback } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Modal } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { useWalletVesting } from '../hooks/useWalletVesting';
import { type ClaimRequest, claimModel, claimUtils } from '../model/claim';
import { type AccountVestingView, Step } from '../types';

import { AccountScheduleModal } from './AccountScheduleModal';
import { Confirmation } from './Confirmation';
import { VestingCallout } from './VestingCallout';
import { VestingScheduleModal } from './VestingScheduleModal';

type Props = {
  accountIds: string[];
};

export const VestingRoot = ({ accountIds }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const step = useUnit(claimModel.$step);
  const vesting = useWalletVesting(accountIds);

  const [isFlowOpen, closeFlow] = useModalClose(!claimUtils.isNoneStep(step), claimModel.flowFinished);

  // Claiming is per account: one `vesting.vest()` releases every vested schedule
  // for that account, so a claim is always a single-account request.
  const handleClaim = useCallback(
    (view: AccountVestingView) => {
      const chain = chains[view.chainId as ChainId];
      if (!chain || !view.claimable_signable || !view.claimable.gtn(0)) return;

      const request: ClaimRequest = {
        chain,
        initiator: view.account,
        claimable: view.claimable,
        stillLocked: view.stillLocked,
      };
      claimModel.claimStarted([request]);
    },
    [chains],
  );

  return (
    <>
      <VestingCallout summary={vesting.summary} pending={vesting.pending} loadingMore={vesting.loadingMore} />
      <VestingScheduleModal vesting={vesting} chains={chains} />
      <AccountScheduleModal vesting={vesting} chains={chains} onClaim={handleClaim} />

      {claimUtils.isSubmitStep(step) && <OperationSubmit isOpen={isFlowOpen} onClose={closeFlow} />}

      {(claimUtils.isConfirmStep(step) || claimUtils.isSignStep(step)) && (
        <Modal isOpen={isFlowOpen} size="md" height="fit" onToggle={(open) => !open && closeFlow()}>
          <Modal.Title close>{t('operations.modalTitles.vest')}</Modal.Title>
          <Modal.Content>
            {claimUtils.isConfirmStep(step) && <Confirmation onGoBack={() => claimModel.flowFinished()} />}
            {claimUtils.isSignStep(step) && <OperationSign onGoBack={() => claimModel.stepChanged(Step.CONFIRM)} />}
          </Modal.Content>
        </Modal>
      )}
    </>
  );
};
