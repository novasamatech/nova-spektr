import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nonNullable, toAccountId } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon, Loader } from '@/shared/ui';
import { AssetBalance, TransactionDetails, TransactionValidationError } from '@/shared/ui-entities';
import { Box, Tooltip } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { AssetFiatBalance } from '@/entities/price';
import { accountUtils, walletModel } from '@/entities/wallet';
import { NamedAccount } from '@/widgets/NameResolver';
import { MultisigExistsAlert } from '../../common/MultisigExistsAlert';
import { confirmModel } from '../model/confirm-model';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
};

export const Confirmation = ({ id = 0, secondaryActionButton, hideSignButton, onGoBack }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);
  const validationErrors = useUnit(confirmModel.$validationErrors);
  const canSubmit = useUnit(confirmModel.$canSubmit);

  const confirms = useUnit(confirmModel.$confirms);
  const confirm = useStoreMap({
    store: confirmModel.$confirmMap,
    keys: [id],
    fn: (value, [id]) => value[id],
  });

  if (!confirm) {
    return (
      <Box verticalAlign="center" horizontalAlign="center" height="200px">
        <Loader color="primary" />
      </Box>
    );
  }

  const {
    meta,
    wallets: { signatory },
  } = confirm;
  const isXcm = meta.destinationChain.chainId !== meta.chain.chainId;
  const hasAnyMultisig = meta.route.some(accountUtils.isAnyMultisigAccount);
  const initiators = confirms.map((confirm) => confirm.meta.initiator);
  const nativeAsset = getNativeAsset(meta.chain.assets);

  return (
    <div className="flex w-modal flex-col items-center gap-y-4 px-5 pt-4 pb-4">
      <TransactionValidationError errors={validationErrors} wallets={wallets} />

      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name={isXcm ? 'crossChainConfirm' : 'transferConfirm'} size={60} />

        <div className="flex flex-col items-center gap-y-1">
          <AssetBalance
            value={meta.amount}
            asset={meta.asset}
            keepPrecision={true}
            className="text-center font-manrope text-[32px] leading-[36px] font-bold text-text-primary"
          />
          <AssetFiatBalance asset={meta.asset} amount={meta.amount} className="text-center text-headline" />
        </div>
      </div>

      <MultisigExistsAlert active={isMultisigExists} />

      <TransactionDetails chain={meta.chain} wallets={wallets} initiators={initiators} signatory={meta.signatory}>
        {isXcm && (
          <DetailRow label={t('operation.details.destinationChain')}>
            <ChainTitle
              className="px-2"
              fontClass="text-text-primary text-footnote"
              chainId={meta.destinationChain.chainId}
            />
          </DetailRow>
        )}

        <DetailRow label={t('operation.details.recipient')} className="text-text-secondary">
          <NamedAccount accountId={toAccountId(meta.destination)} chain={meta.destinationChain} variant="short" />
        </DetailRow>

        <hr className="w-full border-filter-border pr-2" />

        {hasAnyMultisig && (
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
              <AssetBalance value={meta.multisigDeposit} asset={nativeAsset} />
              <AssetFiatBalance asset={nativeAsset} amount={meta.multisigDeposit} />
            </div>
          </DetailRow>
        )}

        {isXcm ? (
          <>
            <DetailRow
              label={<FootnoteText className="text-text-tertiary">{t('operation.originNetworkFee')}</FootnoteText>}
              className="text-text-primary"
              testId={TEST_IDS.OPERATIONS.CONFIRM_NETWORK_FEE}
            >
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={meta.originFee} asset={nativeAsset} />
                <AssetFiatBalance asset={nativeAsset} amount={meta.originFee} />
              </div>
            </DetailRow>
            {nonNullable(meta.destinationFee) && (
              <DetailRow
                label={
                  <FootnoteText className="text-text-tertiary">{t('operation.destinationNetworkFee')}</FootnoteText>
                }
                className="text-text-primary"
              >
                <div className="flex flex-col items-end gap-y-0.5">
                  <AssetBalance value={meta.destinationFee} asset={nativeAsset} />
                  <AssetFiatBalance asset={nativeAsset} amount={meta.destinationFee} />
                </div>
              </DetailRow>
            )}
          </>
        ) : (
          <DetailRow
            label={<FootnoteText className="text-text-tertiary">{t('operation.networkFee')}</FootnoteText>}
            className="text-text-primary"
            testId={TEST_IDS.OPERATIONS.CONFIRM_NETWORK_FEE}
          >
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={meta.fee} asset={nativeAsset} />
              <AssetFiatBalance asset={nativeAsset} amount={meta.fee} />
            </div>
          </DetailRow>
        )}
      </TransactionDetails>

      <div className="mt-3 flex w-full justify-between">
        {nonNullable(onGoBack) && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}

        <div className="flex gap-4">
          {secondaryActionButton}
          {!hideSignButton && !isMultisigExists && (
            <SignButton
              isDefault={Boolean(secondaryActionButton)}
              type={signatory.type}
              disabled={!canSubmit}
              onClick={confirmModel.startSigning}
            />
          )}
        </div>
      </div>
    </div>
  );
};
