import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Alert, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { Modal, Tooltip } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { SignButton } from '@/entities/operations';
import { AssetFiatBalance, priceProviderModel } from '@/entities/price';
import { FeeLoader } from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { convertToFlexibleModel } from '../model/convert-to-flexible-model';

export const ConvertToFlexibleConfirm = () => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const chain = useUnit(convertToFlexibleModel.$chain);
  const account = useUnit(convertToFlexibleModel.$multisigAccount);
  const selectedSignatory = useUnit(convertToFlexibleModel.$selectedSignatory);

  const errors = useUnit(convertToFlexibleModel.$errors);
  const proxyDeposit = useUnit(convertToFlexibleModel.$proxyDeposit);
  const fee = useUnit(convertToFlexibleModel.$fee);
  const multisigDeposit = useUnit(convertToFlexibleModel.$multisigDeposit);
  const isFeeLoading = useUnit(convertToFlexibleModel.$isFeeLoading);

  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  const asset = chain?.assets.at(0);
  if (!chain || !asset || !account) return null;

  const signatoryWallet = selectedSignatory && walletUtils.getWalletById(wallets, selectedSignatory.walletId);

  return (
    <>
      <div className="flex w-modal flex-col items-center gap-y-4 px-5 pb-4 pt-4">
        <div className="mb-2 flex flex-col items-center gap-y-3">
          <Icon className="text-icon-default" name="proxyConfirm" size={60} />
        </div>

        <TransactionDetails chain={chain} wallets={wallets} initiator={[account]} signatory={selectedSignatory}>
          <DetailRow
            className="text-text-primary"
            label={
              <>
                <Icon className="text-text-tertiary" name="lock" size={12} />
                <FootnoteText className="text-text-tertiary">{t('proxy.proxyDepositLabel')}</FootnoteText>
                <Tooltip>
                  <Tooltip.Trigger>
                    <div tabIndex={0}>
                      <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t('proxy.proxyDepositHint')}</Tooltip.Content>
                </Tooltip>
              </>
            }
          >
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={proxyDeposit || '0'} asset={chain.assets[0]} />
              <AssetFiatBalance asset={asset} amount={proxyDeposit || '0'} />
            </div>
          </DetailRow>

          <DetailRow
            className="text-text-primary"
            label={
              <>
                <Icon className="text-text-tertiary" name="lock" size={12} />
                <FootnoteText className="text-text-tertiary">{t('staking.multisigDepositLabel')}</FootnoteText>
                <Tooltip>
                  <Tooltip.Trigger>
                    <div tabIndex={0}>
                      <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t('staking.tooltips.depositDescription')}</Tooltip.Content>
                </Tooltip>
              </>
            }
          >
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={multisigDeposit} asset={asset} />
              <AssetFiatBalance asset={asset} amount={multisigDeposit.toString()} />
            </div>
          </DetailRow>

          <DetailRow
            label={<FootnoteText className="text-text-tertiary">{t('operation.networkFee')}</FootnoteText>}
            className="text-text-primary"
          >
            {isFeeLoading ? (
              <FeeLoader fiatFlag={Boolean(fiatFlag)} />
            ) : (
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={fee} asset={asset} />
                <AssetFiatBalance asset={asset} amount={fee.toString()} />
              </div>
            )}
          </DetailRow>
        </TransactionDetails>

        {errors.map((error) => (
          <Alert key={error.errorText} active={!!error} variant="error" title={t(error.name)}>
            <Alert.Item withDot={false}>{t(error.errorText)}</Alert.Item>
          </Alert>
        ))}
      </div>

      <Modal.Footer>
        <div className="flex w-full justify-end">
          {signatoryWallet && (
            <SignButton
              type={signatoryWallet.type}
              disabled={isFeeLoading || errors.length !== 0}
              onClick={convertToFlexibleModel.sign}
            />
          )}
        </div>
      </Modal.Footer>
    </>
  );
};
