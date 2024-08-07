import { BN } from '@polkadot/util';
import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@app/providers';
import { cnTw, formatAmount } from '@shared/lib/utils';
import { Button, CaptionText, DetailRow, FootnoteText, HeadlineText, Icon, LargeTitleText, Tooltip } from '@shared/ui';
import { ValueIndicator } from '@/entities/governance';
import { AssetBalance } from '@entities/asset';
import { SignButton } from '@entities/operations';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { AddressWithExplorers, ExplorersPopover, WalletCardSm, WalletIcon, accountUtils } from '@entities/wallet';
import { locksModel } from '@/features/governance/model/locks';
import { allTracks } from '@/widgets/DelegateModal/lib/constants';
import { type Config } from '../../../OperationsValidation';
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

  const totalLock = useUnit(locksModel.$totalLock);

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

  if (!confirmStore || !initiatorWallet) {
    return null;
  }

  const amountValue = config.withFormatAmount
    ? formatAmount(confirmStore.balance, confirmStore.asset.precision)
    : confirmStore.balance;

  const votesValue = new BN(amountValue).mul(new BN(confirmStore.conviction)).toString();

  return (
    <>
      <div className="flex flex-col items-center pt-4 gap-y-4 pb-4 px-5 w-modal">
        <div className="flex flex-col items-center gap-y-3 mb-2">
          <Icon className="text-icon-default" name="addDelegationConfirm" size={60} />

          <div className={cnTw('flex flex-col gap-y-1 items-center')}>
            <LargeTitleText>
              <Trans
                t={t}
                i18nKey="governance.addDelegation.votesValue"
                components={{
                  votes: (
                    <AssetBalance
                      value={votesValue}
                      asset={confirmStore.asset}
                      className="text-text-primary text-large-title"
                      showSymbol={false}
                    />
                  ),
                  li: <li />,
                }}
              />
            </LargeTitleText>
            <HeadlineText className="text-text-tertiary">
              <Trans
                t={t}
                i18nKey="governance.addDelegation.balanceValue"
                values={{
                  conviction: confirmStore.conviction,
                }}
                components={{
                  balance: (
                    <AssetBalance
                      value={amountValue}
                      asset={confirmStore.asset}
                      className="text-text-tertiary text-headline"
                    />
                  ),
                }}
              />
            </HeadlineText>
          </div>

          <FootnoteText className="py-2 px-3 rounded bg-block-background ml-3 text-text-secondary">
            {confirmStore.description}
          </FootnoteText>
        </div>

        <dl className="flex flex-col gap-y-4 w-full">
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

              <hr className="border-filter-border w-full pr-2" />

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

          <hr className="border-filter-border w-full pr-2" />

          <DetailRow label={t('governance.addDelegation.confirmation.target')}>
            <AddressWithExplorers address={confirmStore.target} explorers={confirmStore.chain.explorers} type="short" />
          </DetailRow>

          <DetailRow label={t('governance.addDelegation.confirmation.tracks')}>
            <button
              type="button"
              className="flex items-center gap-x-1 px-2 py-1 rounded group hover:bg-action-background-hover"
              onClick={() => {}}
            >
              <div className="rounded-[30px] px-1.5 py-[1px] bg-icon-accent">
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

          <hr className="border-filter-border w-full pr-2" />

          <DetailRow label={t('governance.operations.transferable')} wrapperClassName="items-start">
            <ValueIndicator
              from={confirmStore.transferable}
              to={new BN(confirmStore.transferable)
                .sub(
                  new BN(
                    config.withFormatAmount
                      ? formatAmount(confirmStore.balance, confirmStore.asset.precision)
                      : confirmStore.balance,
                  ),
                )
                .toString()}
              asset={confirmStore.asset}
            />
          </DetailRow>

          <DetailRow label={t('governance.locks.governanceLock')} wrapperClassName="items-start">
            <ValueIndicator
              from={totalLock.toString()}
              to={new BN(totalLock)
                .add(
                  new BN(
                    config.withFormatAmount
                      ? formatAmount(confirmStore.balance, confirmStore.asset.precision)
                      : confirmStore.balance,
                  ),
                )
                .toString()}
              asset={confirmStore.asset}
            />
          </DetailRow>

          <hr className="border-filter-border w-full pr-2" />

          {accountUtils.isMultisigAccount(confirmStore.shards[0]) && (
            <DetailRow
              className="text-text-primary"
              label={
                <>
                  <Icon className="text-text-tertiary" name="lock" size={12} />
                  <FootnoteText className="text-text-tertiary">{t('staking.multisigDepositLabel')}</FootnoteText>
                  <Tooltip content={t('staking.tooltips.depositDescription')} offsetPx={-90}>
                    <Icon name="info" className="hover:text-icon-hover cursor-pointer" size={16} />
                  </Tooltip>
                </>
              }
            >
              <div className="flex flex-col gap-y-0.5 items-end">
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
            <div className="flex flex-col gap-y-0.5 items-end">
              <AssetBalance value={confirmStore.fee} asset={confirmStore.chain.assets[0]} />
              <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={confirmStore.fee} />
            </div>
          </DetailRow>

          {confirmStore.shards.length > 1 && (
            <DetailRow
              className="text-text-primary"
              label={<FootnoteText className="text-text-tertiary">{t('staking.networkFeeTotal')}</FootnoteText>}
            >
              <div className="flex flex-col gap-y-0.5 items-end">
                <AssetBalance value={confirmStore.totalFee} asset={confirmStore.chain.assets[0]} />
                <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={confirmStore.totalFee} />
              </div>
            </DetailRow>
          )}
        </dl>

        <div className="flex w-full justify-between mt-3">
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
                type={(signerWallet || initiatorWallet).type}
                onClick={confirmModel.output.formSubmitted}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};
