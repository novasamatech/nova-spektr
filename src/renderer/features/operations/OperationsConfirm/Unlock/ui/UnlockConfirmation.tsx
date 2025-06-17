import { BN } from '@polkadot/util';
import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { getNativeAsset, transferableAmount } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon, Loader } from '@/shared/ui';
import { AssetBalance, TransactionDetails } from '@/shared/ui-entities';
import { Box, Tooltip } from '@/shared/ui-kit';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { basketUtils } from '@/entities/basket';
import { BalanceDiff } from '@/entities/governance';
import { SignButton } from '@/entities/operations';
import { AssetFiatBalance } from '@/entities/price';
import { accountUtils, walletModel } from '@/entities/wallet';
import { MultisigExistsAlert } from '@/features/operations/OperationsConfirm/common/MultisigExistsAlert';
import { unlockConfirmModel } from '../model/unlockConfirm';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
};

export const UnlockConfirmation = ({ id = 0, hideSignButton, secondaryActionButton, onGoBack }: Props) => {
  const { t } = useI18n();
  const wallets = useUnit(walletModel.$wallets);
  const balances = useUnit(balanceModel.$balances);
  const confirms = useUnit(unlockConfirmModel.$confirms);

  const confirmStore = useStoreMap({
    store: unlockConfirmModel.$confirmMap,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const initiatorWallet = confirmStore.wallets.initiator;
  const signerWallet = confirmStore.wallets.signatory;

  const balance = balanceUtils.getBalance(
    balances,
    confirmStore.meta.initiator.accountId,
    confirmStore.meta.chain.chainId,
    confirmStore.meta.asset.assetId.toString(),
  );

  const transferableBalance = new BN(transferableAmount(balance));

  const isMultisigExists = useUnit(unlockConfirmModel.$isMultisigExists);

  if (!confirmStore || !initiatorWallet || !confirmStore.meta.chain) {
    return (
      <Box width="440px" height="430px" verticalAlign="center" horizontalAlign="center">
        <Loader color="primary" />
      </Box>
    );
  }

  const proxyAccount = confirmStore.meta.route.find(accountUtils.isProxiedAccount);
  const { fee, asset, amount, totalLock, initiator, signatory } = confirmStore.meta;
  const initiators = confirms.map((confirm) => confirm.meta.initiator);
  const nativeAsset = getNativeAsset(confirmStore.meta.chain.assets);

  return (
    <div className="flex w-modal flex-col items-center gap-y-4 px-5 pb-4 pt-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name="unlockMst" size={60} />

        <div className="flex flex-col items-center gap-y-1">
          <AssetBalance
            value={amount}
            asset={asset}
            className="font-manrope text-[32px] font-bold leading-[36px] text-text-primary"
          />
          <AssetFiatBalance asset={asset} amount={amount} className="text-headline" />
        </div>
      </div>

      <MultisigExistsAlert active={isMultisigExists} />

      <TransactionDetails
        chain={confirmStore.meta.chain}
        wallets={wallets}
        initiators={initiators}
        signatory={signatory}
        proxied={proxyAccount}
      >
        <DetailRow label={t('governance.operations.transferable')} wrapperClassName="items-start">
          <BalanceDiff from={transferableBalance} to={transferableBalance.add(new BN(amount))} asset={asset} />
        </DetailRow>
        <DetailRow label={t('governance.locks.governanceLock')} wrapperClassName="items-start">
          <BalanceDiff from={totalLock} to={totalLock.sub(new BN(amount))} asset={asset} />
        </DetailRow>

        {/* TODO: add undelegate period */}
        {/* <DetailRow label={t('governance.locks.undelegatePeriod')} wrapperClassName="items-start">
          <ValueIndicator
            from={totalLock.toString()}
            to={totalLock.sub(new BN(confirmStore.amount)).toString()}
            asset={asset}
          />
        </DetailRow> */}

        <hr className="w-full border-filter-border pr-2" />

        {accountUtils.isMultisigAccount(initiator) && (
          <DetailRow
            className="text-text-primary"
            label={
              <>
                <Icon className="text-text-tertiary" name="lock" size={12} />
                <FootnoteText className="text-text-tertiary">{t('operation.details.deposit')}</FootnoteText>
                <Tooltip>
                  <Tooltip.Trigger>
                    <div tabIndex={0}>
                      <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t('transfer.networkDepositHint')}</Tooltip.Content>
                </Tooltip>
              </>
            }
          >
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={confirmStore.meta.multisigDeposit} asset={nativeAsset} />
              <AssetFiatBalance asset={nativeAsset} amount={confirmStore.meta.multisigDeposit} />
            </div>
          </DetailRow>
        )}

        <DetailRow
          label={<FootnoteText className="text-text-tertiary">{t('operation.networkFee', { count: 1 })}</FootnoteText>}
          className="text-text-primary"
        >
          <div className="flex flex-col items-end gap-y-0.5">
            <AssetBalance value={fee} asset={nativeAsset} />
            <AssetFiatBalance asset={nativeAsset} amount={fee} />
          </div>
        </DetailRow>
      </TransactionDetails>

      <div className="mt-3 flex w-full justify-between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}

        <div className="flex gap-4">
          {basketUtils.isBasketAvailable(initiatorWallet) && secondaryActionButton}
          {!hideSignButton && !isMultisigExists && (
            <SignButton
              isDefault={basketUtils.isBasketAvailable(initiatorWallet) && Boolean(secondaryActionButton)}
              type={signerWallet.type}
              onClick={unlockConfirmModel.startSigning}
            />
          )}
        </div>
      </div>
    </div>
  );
};
