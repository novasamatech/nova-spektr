import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nonNullable } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { SignButton } from '@/entities/operations';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { confirmModel } from '@/features/operations/OperationsConfirm/VerifyProxy/model/confirm-model';
import { MultisigExistsAlert } from '@/features/operations/OperationsConfirm/common/MultisigExistsAlert';
import { MultisigOperationDescriptionField } from '@/features/operations/OperationsConfirm/common/MultisigOperationDescriptionField';
import { NamedAccount } from '@/widgets/NameResolver';
import { FeeWithLabel, MultisigDepositFee } from '@/widgets/transaction-fee';
import { verifyProxyModel } from '../model/verify-proxy-model';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
};

export const VerifyProxyConfirmation = ({ id = 0, secondaryActionButton, hideSignButton, onGoBack }: Props) => {
  const { t } = useI18n();
  const wallets = useUnit(walletModel.$wallets);

  const confirms = useUnit(confirmModel.$confirms);
  const confirmItem = useStoreMap({
    store: confirmModel.$confirmStore,
    keys: [id],
    fn: (map, [confirmId]) => (map ? map[confirmId] : null) ?? null,
  });
  const confirmMetaSnapshot = useUnit(verifyProxyModel.$confirmMeta);
  const pendingFee = useUnit(verifyProxyModel.$pendingFee);
  const liveFee = useUnit(verifyProxyModel.$fee);
  const liveMultisigDeposit = useUnit(verifyProxyModel.$multisigDeposit);

  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);

  const meta = confirmItem?.meta ?? confirmMetaSnapshot;
  if (!meta) {
    return null;
  }

  const initiators = confirms.length > 0 ? confirms.map((confirm) => confirm.meta.initiator) : [meta.initiator];

  const signatoryWallet = confirmItem?.wallets.signatory ?? walletUtils.getWalletById(wallets, meta.signatory.walletId);
  const signatoryWalletType = signatoryWallet?.type;

  const {
    chain,
    signatory,
    route,
    fee: metaFee,
    multisigDeposit: metaMultisigDeposit,
    proxyType,
    pureProxyAccountId,
    memo,
  } = meta;

  const hasMultisigAccount = route.some(accountUtils.isAnyMultisigAccount);

  const nativeAsset = getNativeAsset(chain.assets);

  const feeValue = liveFee ?? metaFee;
  const multisigDepositValue = liveMultisigDeposit ?? metaMultisigDeposit;

  return (
    <div className="flex min-h-0 w-full flex-col items-center gap-y-4 px-5 pt-4 pb-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon name="proxyConfirm" size={60} />
      </div>

      <MultisigExistsAlert active={isMultisigExists} />

      <TransactionDetails chain={chain} wallets={wallets} initiators={initiators} signatory={signatory}>
        <DetailRow label={t('proxy.details.accessType')} className="pr-2">
          <FootnoteText>{proxyType}</FootnoteText>
        </DetailRow>

        <DetailRow label={t('walletDetails.proxies.verifyConfirmPureProxy')} className="text-text-secondary">
          <NamedAccount accountId={pureProxyAccountId} chain={chain} variant="short" />
        </DetailRow>

        {memo && (
          <DetailRow label={t('walletDetails.proxies.verifyConfirmMemo')} className="pr-2">
            <FootnoteText className="break-all">{memo}</FootnoteText>
          </DetailRow>
        )}

        <hr className="w-full border-filter-border pr-2" />

        {hasMultisigAccount && <MultisigDepositFee asset={nativeAsset} multisigDeposit={multisigDepositValue} />}

        <FeeWithLabel asset={nativeAsset} fee={feeValue} isLoading={pendingFee} />
      </TransactionDetails>

      <MultisigOperationDescriptionField />

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
              isDefault={nonNullable(secondaryActionButton)}
              type={signatoryWalletType}
              onClick={confirmModel.startSigning}
            />
          )}
        </div>
      </div>
    </div>
  );
};
