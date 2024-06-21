import { useUnit } from 'effector-react';
import { ReactNode } from 'react';

import { Button, DetailRow, FootnoteText, Icon, Tooltip } from '@shared/ui';
import { useI18n } from '@app/providers';
import { SignButton } from '@entities/operations';
import { AddressWithExplorers, WalletIcon, ExplorersPopover, WalletCardSm, accountUtils } from '@entities/wallet';
import { cnTw } from '@shared/lib/utils';
import { AssetBalance } from '@entities/asset';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { ChainTitle } from '@entities/chain';
import { confirmModel } from '../model/confirm-model';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
};

export const Confirmation = ({ id = 0, secondaryActionButton, hideSignButton, onGoBack }: Props) => {
  const { t } = useI18n();

  const isXcms = useUnit(confirmModel.$isXcm);

  const stores = useUnit(confirmModel.$confirmStore);
  const initiatorWallets = useUnit(confirmModel.$initiatorWallets);
  const signerWallets = useUnit(confirmModel.$signerWallets);
  const proxiedWallets = useUnit(confirmModel.$proxiedWallets);

  const confirmStore = stores?.[id];
  const initiatorWallet = initiatorWallets[id];
  const signerWallet = signerWallets[id];
  const proxiedWallet = proxiedWallets[id];
  const isXcm = isXcms[id];

  if (!confirmStore || !initiatorWallet) return null;

  return (
    <div className="flex flex-col items-center pt-4 gap-y-4 pb-4 px-5 w-modal">
      <div className="flex flex-col items-center gap-y-3 mb-2">
        <Icon className="text-icon-default" name={isXcm ? 'crossChainConfirm' : 'transferConfirm'} size={60} />

        <div className={cnTw('flex flex-col gap-y-1 items-center')}>
          <AssetBalance
            value={confirmStore.amount}
            asset={confirmStore.asset}
            className="font-manrope text-text-primary text-[32px] leading-[36px] font-bold"
          />
          <AssetFiatBalance asset={confirmStore.asset} amount={confirmStore.amount} className="text-headline" />
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

            <DetailRow label={t('transfer.senderAccount')}>
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

            <DetailRow label={t('proxy.details.account')}>
              <AddressWithExplorers
                type="short"
                explorers={confirmStore.chain.explorers}
                addressFont="text-footnote text-inherit"
                accountId={confirmStore.account.accountId}
                addressPrefix={confirmStore.chain.addressPrefix}
                wrapperClassName="text-text-secondary"
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

        {isXcm && (
          <DetailRow label={t('operation.details.destinationChain')}>
            <ChainTitle
              className="px-2"
              fontClass="text-text-primary text-footnote"
              chainId={confirmStore.xcmChain.chainId}
            />
          </DetailRow>
        )}

        <DetailRow label={t('operation.details.recipient')}>
          <AddressWithExplorers
            type="short"
            explorers={confirmStore.chain.explorers}
            addressFont="text-footnote text-inherit"
            address={confirmStore.destination}
            addressPrefix={confirmStore.chain.addressPrefix}
            wrapperClassName="text-text-secondary"
          />
        </DetailRow>

        <hr className="border-filter-border w-full pr-2" />

        {accountUtils.isMultisigAccount(confirmStore.account) && (
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
          label={<FootnoteText className="text-text-tertiary">{t('operation.networkFee')}</FootnoteText>}
          className="text-text-primary"
        >
          <div className="flex flex-col gap-y-0.5 items-end">
            <AssetBalance value={confirmStore.fee} asset={confirmStore.chain.assets[0]} />
            <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={confirmStore.fee} />
          </div>
        </DetailRow>

        {isXcm && (
          <DetailRow
            label={<FootnoteText className="text-text-tertiary">{t('operation.xcmFee')}</FootnoteText>}
            className="text-text-primary"
          >
            <div className="flex flex-col gap-y-0.5 items-end">
              <AssetBalance value={confirmStore.xcmFee} asset={confirmStore.chain.assets[0]} />
              <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={confirmStore.xcmFee} />
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
              onClick={confirmModel.events.confirmed}
            />
          )}
        </div>
      </div>
    </div>
  );
};
