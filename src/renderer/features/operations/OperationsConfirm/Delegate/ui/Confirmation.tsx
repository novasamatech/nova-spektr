import { BN } from '@polkadot/util';
import { useGate, useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@app/providers';
import { formatAmount } from '@shared/lib/utils';
import { Button, CaptionText, DetailRow, FootnoteText, HeadlineText, Icon, LargeTitleText, Tooltip } from '@shared/ui';
import { BalanceDiff, LockPeriodDiff, LockValueDiff, votingService } from '@/entities/governance';
import { AssetBalance } from '@entities/asset';
import { SignButton } from '@entities/operations';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { AddressWithExplorers, ExplorersPopover, WalletCardSm, WalletIcon, accountUtils } from '@entities/wallet';
import { lockPeriodsModel, locksPeriodsAggregate } from '@/features/governance';
import { allTracks } from '@/widgets/DelegateModal/lib/constants';
import { type Config } from '../../../OperationsValidation';
import { MultisigExistsAlert } from '../../common/MultisigExistsAlert';
import { confirmModel } from '../model/confirm-model';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  config?: Config;

  onGoBack?: () => void;
};

export const Confirmation = ({
  id = 0,
  secondaryActionButton,
  hideSignButton,
  onGoBack,
  config = { withFormatAmount: true },
}: Props) => {
  const { t } = useI18n();

  const confirmStore = useStoreMap({
    store: confirmModel.$confirmStore,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const initiatorWallet = useStoreMap({
    store: confirmModel.$initiatorWallets,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const signerWallet = useStoreMap({
    store: confirmModel.$signerWallets,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const proxiedWallet = useStoreMap({
    store: confirmModel.$proxiedWallets,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const lockPeriods = useStoreMap({
    store: lockPeriodsModel.$lockPeriods,
    keys: [confirmStore?.chain],
    fn: (locks, [chain]) => (chain ? (locks[chain.chainId] ?? null) : null),
  });

  useGate(locksPeriodsAggregate.gates.flow, { chain: confirmStore?.chain });

  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);

  if (!confirmStore || !initiatorWallet) {
    return null;
  }

  const amountValue = config.withFormatAmount
    ? formatAmount(confirmStore.balance, confirmStore.asset.precision)
    : confirmStore.balance;

  const convictionValue = votingService.getConvictionMultiplier(confirmStore.conviction);
  const votesValue = votingService.calculateVotingPower(new BN(amountValue), confirmStore.conviction);

  return (
    <div className="flex w-modal flex-col items-center gap-y-4 px-5 py-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name="addDelegationConfirm" size={60} />

        <div className="flex flex-col items-center gap-y-1">
          <LargeTitleText>
            <Trans
              t={t}
              i18nKey="governance.addDelegation.votesValue"
              components={{
                votes: (
                  <AssetBalance
                    value={votesValue}
                    asset={confirmStore.asset}
                    className="text-large-title text-text-primary"
                    showSymbol={false}
                  />
                ),
              }}
            />
          </LargeTitleText>
          <HeadlineText className="text-text-tertiary">
            <Trans
              t={t}
              i18nKey="governance.addDelegation.balanceValue"
              values={{
                conviction: convictionValue,
              }}
              components={{
                balance: (
                  <AssetBalance
                    value={amountValue}
                    asset={confirmStore.asset}
                    className="text-headline text-text-tertiary"
                  />
                ),
              }}
            />
          </HeadlineText>
        </div>

        <FootnoteText className="ml-3 rounded bg-block-background px-3 py-2 text-text-secondary">
          {confirmStore.description}
        </FootnoteText>
      </div>

      <MultisigExistsAlert active={isMultisigExists} />

      <dl className="flex w-full flex-col gap-y-4">
        {proxiedWallet && confirmStore.proxiedAccount && (
          <>
            <DetailRow label={t('transfer.senderProxiedWallet')} className="flex gap-x-2">
              <WalletIcon type={proxiedWallet.type} size={16} />
              <FootnoteText className="pr-2">{proxiedWallet.name}</FootnoteText>
            </DetailRow>

            <DetailRow label={t('transfer.senderProxiedAccount')}>
              <AddressWithExplorers
                type="short"
                explorers={confirmStore.chain.explorers}
                addressFont="text-footnote text-inherit"
                accountId={confirmStore.proxiedAccount.accountId}
                addressPrefix={confirmStore.chain.addressPrefix}
                wrapperClassName="text-text-secondary"
              />
            </DetailRow>

            <hr className="w-full border-filter-border pr-2" />

            <DetailRow label={t('transfer.signingWallet')} className="flex gap-x-2">
              <WalletIcon type={initiatorWallet.type} size={16} />
              <FootnoteText className="pr-2">{initiatorWallet.name}</FootnoteText>
            </DetailRow>

            <DetailRow label={t('transfer.signingAccount')}>
              <AddressWithExplorers
                type="short"
                explorers={confirmStore.chain.explorers}
                addressFont="text-footnote text-inherit"
                accountId={confirmStore.proxiedAccount.proxyAccountId}
                addressPrefix={confirmStore.chain.addressPrefix}
                wrapperClassName="text-text-secondary"
              />
            </DetailRow>
          </>
        )}

        {!proxiedWallet && (
          <>
            <DetailRow label={t('proxy.details.wallet')} className="flex gap-x-2">
              <WalletIcon type={initiatorWallet.type} size={16} />
              <FootnoteText className="pr-2">{initiatorWallet.name}</FootnoteText>
            </DetailRow>

            <DetailRow label={t('staking.confirmation.accountLabel', { count: 1 })}>
              <AddressWithExplorers
                type="short"
                wrapperClassName="text-text-secondary"
                explorers={confirmStore.chain.explorers}
                accountId={confirmStore.shards[0].accountId}
                addressPrefix={confirmStore.chain.addressPrefix}
              />
            </DetailRow>
          </>
        )}

        {signerWallet && confirmStore.signatory && (
          <DetailRow label={t('proxy.details.signatory')}>
            <ExplorersPopover
              button={<WalletCardSm wallet={signerWallet} />}
              address={confirmStore.signatory.accountId}
              explorers={confirmStore.chain.explorers}
              addressPrefix={confirmStore.chain.addressPrefix}
            />
          </DetailRow>
        )}

        <hr className="w-full border-filter-border pr-2" />

        <DetailRow label={t('governance.addDelegation.confirmation.target')}>
          <AddressWithExplorers address={confirmStore.target} explorers={confirmStore.chain.explorers} type="short" />
        </DetailRow>

        <DetailRow label={t('governance.addDelegation.confirmation.tracks')}>
          <button
            type="button"
            className="group flex items-center gap-x-1 rounded px-2 py-1 hover:bg-action-background-hover"
            onClick={() => {}}
          >
            <div className="rounded-[30px] bg-icon-accent px-1.5 py-[1px]">
              <CaptionText className="text-white">{confirmStore.tracks.length}</CaptionText>
            </div>
            <Tooltip
              content={confirmStore.tracks
                .map((trackId) => t(allTracks.find((track) => Number(track.id) === trackId)!.value))
                .join(', ')}
              pointer="up"
            >
              <Icon className="group-hover:text-icon-hover" name="info" size={16} />
            </Tooltip>
          </button>
        </DetailRow>

        <hr className="w-full border-filter-border pr-2" />

        <DetailRow label={t('governance.operations.transferable')} wrapperClassName="items-start">
          <BalanceDiff
            from={confirmStore.transferable}
            to={new BN(confirmStore.transferable).sub(new BN(amountValue))}
            asset={confirmStore.asset}
            lock={confirmStore.locks}
          />
        </DetailRow>

        <DetailRow label={t('governance.locks.governanceLock')} wrapperClassName="items-start">
          <LockValueDiff from={confirmStore.locks} to={amountValue} asset={confirmStore.asset} />
        </DetailRow>

        <DetailRow label={t('governance.locks.undelegatePeriod')} wrapperClassName="items-start">
          <LockPeriodDiff from="None" to={confirmStore.conviction} lockPeriods={lockPeriods} />
        </DetailRow>

        <hr className="w-full border-filter-border pr-2" />

        {accountUtils.isMultisigAccount(confirmStore.shards[0]) && (
          <DetailRow
            className="text-text-primary"
            label={
              <>
                <Icon className="text-text-tertiary" name="lock" size={12} />
                <FootnoteText className="text-text-tertiary">{t('staking.multisigDepositLabel')}</FootnoteText>
                <Tooltip content={t('staking.tooltips.depositDescription')} offsetPx={-90}>
                  <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
                </Tooltip>
              </>
            }
          >
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={confirmStore.multisigDeposit} asset={confirmStore.chain.assets[0]} />
              <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={confirmStore.multisigDeposit} />
            </div>
          </DetailRow>
        )}

        <DetailRow
          className="text-text-primary"
          label={
            <FootnoteText className="text-text-tertiary">
              {t('staking.networkFee', { count: confirmStore.shards.length || 1 })}
            </FootnoteText>
          }
        >
          <div className="flex flex-col items-end gap-y-0.5">
            <AssetBalance value={confirmStore.fee} asset={confirmStore.chain.assets[0]} />
            <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={confirmStore.fee} />
          </div>
        </DetailRow>

        {confirmStore.shards.length > 1 && (
          <DetailRow
            className="text-text-primary"
            label={<FootnoteText className="text-text-tertiary">{t('staking.networkFeeTotal')}</FootnoteText>}
          >
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={confirmStore.totalFee} asset={confirmStore.chain.assets[0]} />
              <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={confirmStore.totalFee} />
            </div>
          </DetailRow>
        )}
      </dl>

      <div className="mt-3 flex w-full justify-between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}

        <div className="flex gap-4">
          {secondaryActionButton}

          {!hideSignButton && !isMultisigExists && (
            <SignButton
              isDefault={Boolean(secondaryActionButton)}
              type={(signerWallet || initiatorWallet).type}
              onClick={confirmModel.output.formSubmitted}
            />
          )}
        </div>
      </div>
    </div>
  );
};
