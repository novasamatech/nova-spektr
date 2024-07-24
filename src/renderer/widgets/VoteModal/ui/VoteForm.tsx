import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { useState } from 'react';

import { useI18n } from '@app/providers';
import { type Asset, type Chain } from '@shared/core';
import { formatAsset } from '@shared/lib/utils';
import {
  Alert,
  ButtonCard,
  ConfirmModal,
  DetailRow,
  FootnoteText,
  LabelHelpBox,
  Popover,
  Shimmering,
  SmallTitleText,
} from '@shared/ui';
import { BalanceDiff, LockPeriodDiff } from '@entities/governance';
import { voteModalAggregate } from '../aggregates/voteModal';

import { AboutVoting } from './AboutVoting';
import { AccountsSelector } from './formFields/AccountsSelector';
import { Amount } from './formFields/Amount';
import { ConvictionSelect } from './formFields/ConvictionSelect';
import { Signatories } from './formFields/Signatories';

type Props = {
  chain: Chain;
  asset: Asset;
  hasDelegated?: boolean;
};

export const VoteForm = ({ chain, asset, hasDelegated = false }: Props) => {
  const { t } = useI18n();

  const initialAmount = useUnit(voteModalAggregate.$initialAmount);
  const initialConviction = useUnit(voteModalAggregate.$initialConviction);
  const fee = useUnit(voteModalAggregate.$fee);

  const availableBalance = useUnit(voteModalAggregate.$availableBalance);
  const isMultisig = useUnit(voteModalAggregate.signatory.$isMultisig);
  const signatories = useUnit(voteModalAggregate.signatory.$available);
  const accounts = useUnit(voteModalAggregate.accounts.$available);
  const isFeeLoading = useUnit(voteModalAggregate.$isFeeLoading);

  const {
    submit,
    fields: { account, signatory, conviction, amount, decision },
  } = useForm(voteModalAggregate.form);

  const [showAbstainConfirm, setShowAbstainConfirm] = useState<boolean>(false);

  return (
    <>
      <div className="flex flex-col px-5 py-4 gap-6">
        <div className="flex">
          <Popover offsetPx={5} horizontal="right" panelClass="w-90" content={<AboutVoting />}>
            <LabelHelpBox>{t('governance.voting.aboutLabel')}</LabelHelpBox>
          </Popover>
        </div>
        <div className="flex flex-col gap-4">
          {accounts.length > 1 && (
            <AccountsSelector
              value={account.value}
              asset={asset}
              chain={chain}
              accounts={accounts}
              hasError={account.hasError()}
              errorText={t(account.errorText())}
              onChange={account.onChange}
            />
          )}
          {isMultisig && (
            <Signatories
              value={signatory.value}
              asset={asset}
              chain={chain}
              signatories={signatories}
              errorText={signatory.errorText()}
              hasError={signatory.hasError()}
              onChange={signatory.onChange}
            />
          )}
          <Amount
            value={amount.value}
            asset={asset}
            availableBalance={availableBalance}
            hasError={amount.hasError()}
            errorText={amount.errorText()}
            onChange={amount.onChange}
          />
          <ConvictionSelect
            value={conviction.value}
            asset={asset}
            amount={amount.value}
            onChange={conviction.onChange}
          />
        </div>
        <div className="flex flex-col gap-4">
          <DetailRow wrapperClassName="items-start" label={t('governance.vote.field.governanceLock')}>
            <BalanceDiff from={initialAmount.toString()} to={amount.value.toString()} asset={asset} />
          </DetailRow>
          <DetailRow wrapperClassName="items-start" label={t('governance.vote.field.lockingPeriod')}>
            <LockPeriodDiff from={initialConviction} to={conviction.value} />
          </DetailRow>
          <DetailRow label={t('governance.vote.field.networkFee')}>
            {isFeeLoading && fee.isZero() ? (
              <Shimmering height={18} width={50} />
            ) : (
              <FootnoteText>{formatAsset(fee, asset)}</FootnoteText>
            )}
          </DetailRow>
        </div>
        <Alert active={hasDelegated} title="Already delegating votes" variant="error">
          {t('governance.vote.delegationError')}
        </Alert>
        <div className="flex gap-4 shrink-0">
          <ButtonCard
            className="grow basis-0"
            icon="thumbDown"
            pallet="negative"
            onClick={() => {
              decision.onChange('nay');
              submit();
            }}
          >
            {t('governance.referendum.nay')}
          </ButtonCard>
          <ButtonCard
            className="grow basis-0"
            icon="minusCircle"
            pallet="secondary"
            onClick={() => setShowAbstainConfirm(true)}
          >
            {t('governance.referendum.abstain')}
          </ButtonCard>
          <ButtonCard
            className="grow basis-0"
            icon="thumbUp"
            pallet="positive"
            onClick={() => {
              decision.onChange('aye');
              submit();
            }}
          >
            {t('governance.referendum.aye')}
          </ButtonCard>
        </div>
      </div>

      {showAbstainConfirm && (
        <ConfirmModal
          isOpen
          panelClass="w-60"
          cancelText={t('general.button.cancelButton')}
          confirmText={t('general.button.continueButton')}
          onClose={() => setShowAbstainConfirm(false)}
          onConfirm={() => {
            setShowAbstainConfirm(false);
            conviction.onChange('None');
            decision.onChange('abstain');
            submit();
          }}
        >
          <div className="flex flex-col gap-2">
            <SmallTitleText className="text-center">
              {t('governance.vote.abstainConvictionWarningTitle')}
            </SmallTitleText>
            <FootnoteText className="text-center text-text-tertiary">
              {t('governance.vote.abstainConvictionWarningDescription')}
            </FootnoteText>
          </div>
        </ConfirmModal>
      )}
    </>
  );
};

// const FeeSection = () => {
//   const { t } = useI18n();
//
//   const {
//     fields: { account },
//   } = useForm(voteAggregate.$form);
//
//   const network = useUnit(formModel.$networkStore);
//   const feeData = useUnit(formModel.$feeData);
//   const isFeeLoading = useUnit(formModel.$isFeeLoading);
//   const isMultisig = useUnit(formModel.$isMultisig);
//
//   const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
//
//   if (!network || shards.value.length === 0) {
//     return null;
//   }
//
//   return (
//     <div className="flex flex-col gap-y-2">
//       {isMultisig && (
//         <DetailRow
//           className="text-text-primary"
//           label={
//             <>
//               <Icon className="text-text-tertiary" name="lock" size={12} />
//               <FootnoteText className="text-text-tertiary">{t('staking.multisigDepositLabel')}</FootnoteText>
//               <Tooltip content={t('staking.tooltips.depositDescription')} offsetPx={-90}>
//                 <Icon name="info" className="hover:text-icon-hover cursor-pointer" size={16} />
//               </Tooltip>
//             </>
//           }
//         >
//           <div className="flex flex-col gap-y-0.5 items-end">
//             <AssetBalance value={feeData.multisigDeposit} asset={network.chain.assets[0]} />
//             <AssetFiatBalance asset={network.chain.assets[0]} amount={feeData.multisigDeposit} />
//           </div>
//         </DetailRow>
//       )}
//
//       <DetailRow
//         label={
//           <FootnoteText className="text-text-tertiary">
//             {t('staking.networkFee', { count: shards.value.length || 1 })}
//           </FootnoteText>
//         }
//         className="text-text-primary"
//       >
//         {isFeeLoading ? (
//           <FeeLoader fiatFlag={Boolean(fiatFlag)} />
//         ) : (
//           <div className="flex flex-col gap-y-0.5 items-end">
//             <AssetBalance value={feeData.fee} asset={network.chain.assets[0]} />
//             <AssetFiatBalance asset={network.chain.assets[0]} amount={feeData.fee} />
//           </div>
//         )}
//       </DetailRow>
//
//       {shards.value.length > 1 && (
//         <DetailRow
//           label={<FootnoteText className="text-text-tertiary">{t('staking.networkFeeTotal')}</FootnoteText>}
//           className="text-text-primary"
//         >
//           {isFeeLoading ? (
//             <FeeLoader fiatFlag={Boolean(fiatFlag)} />
//           ) : (
//             <div className="flex flex-col gap-y-0.5 items-end">
//               <AssetBalance value={feeData.totalFee} asset={network.chain.assets[0]} />
//               <AssetFiatBalance asset={network.chain.assets[0]} amount={feeData.totalFee} />
//             </div>
//           )}
//         </DetailRow>
//       )}
//     </div>
//   );
// };
