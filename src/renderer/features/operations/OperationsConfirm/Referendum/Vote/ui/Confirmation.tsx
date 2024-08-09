import { BN } from '@polkadot/util';
import { useStoreMap } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@app/providers';
import { cnTw, formatAsset } from '@shared/lib/utils';
import { Button, DetailRow, HeadlineText, Icon } from '@shared/ui';
import { AssetBalance } from '@entities/asset';
import { BalanceDiff, LockPeriodDiff, voteTransactionService, votingService } from '@entities/governance';
import { SignButton } from '@entities/operations';
import { Fee } from '@entities/transaction';
import { ConfirmDetails } from '../../../common/ConfirmDetails';
import { confirmModel } from '../model/confirm-model';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
};

export const Confirmation = ({ id = 0, secondaryActionButton, hideSignButton, onGoBack }: Props) => {
  const { t } = useI18n();

  const confirm = useStoreMap({
    store: confirmModel.$confirmMap,
    keys: [id],
    fn: (value, [id]) => value?.[id] ?? null,
  });

  if (!confirm) {
    return null;
  }

  const { asset, initialAmount, initialConviction, wrappedTransactions } = confirm.meta;

  if (!voteTransactionService.isVoteTransaction(wrappedTransactions.coreTx)) {
    return null;
  }

  const { vote } = wrappedTransactions.coreTx.args;

  const amount = new BN('Standard' in vote ? vote.Standard.balance : vote.SplitAbstain.abstain);
  const decision = 'Standard' in vote ? (vote.Standard.vote.aye ? 'aye' : 'nay') : 'abstain';
  const conviction = 'Standard' in vote ? vote.Standard.vote.conviction : 'None';

  return (
    <div className="flex flex-col items-center gap-4 px-5 py-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name="voteMst" size={60} />

        <div className={cnTw('flex flex-col items-center gap-y-1')}>
          <AssetBalance
            value={votingService.calculateVotingPower(amount, conviction)}
            asset={confirm.meta.asset}
            className="font-manrope text-[32px] font-bold leading-[36px] text-text-primary"
          />
          <HeadlineText className="text-text-tertiary">
            {t('general.actions.multiply', {
              value: formatAsset(amount, asset),
              multiplier: `${votingService.getConvictionMultiplier(conviction)}x`,
            })}
          </HeadlineText>
        </div>
      </div>

      <ConfirmDetails confirm={confirm}>
        <hr className="w-full border-filter-border pr-2" />
        <DetailRow label="Vote">{t(`governance.referendum.${decision}`)}</DetailRow>
        <DetailRow wrapperClassName="items-start" label={t('governance.vote.field.governanceLock')}>
          <BalanceDiff from={initialAmount.toString()} to={amount.toString()} asset={asset} />
        </DetailRow>
        <DetailRow wrapperClassName="items-start" label={t('governance.vote.field.lockingPeriod')}>
          <LockPeriodDiff from={initialConviction} to={conviction} />
        </DetailRow>
        <hr className="w-full border-filter-border pr-2" />
        <DetailRow label={t('governance.vote.field.networkFee')}>
          <Fee
            api={confirm.meta.api}
            asset={confirm.meta.asset}
            transaction={confirm.meta.wrappedTransactions.wrappedTx}
          />
        </DetailRow>
      </ConfirmDetails>

      <div className="mt-3 flex w-full justify-between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}

        <div className="flex gap-4">
          {secondaryActionButton}

          {!hideSignButton && (
            <SignButton
              isDefault={Boolean(secondaryActionButton)}
              type={(confirm.wallets.signer || confirm.wallets.initiator)?.type}
              onClick={() => {
                confirmModel.events.sign();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
