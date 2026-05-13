import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nonNullable } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { SignButton } from '@/entities/operations';
import { accountUtils, walletModel } from '@/entities/wallet';
import { NamedAccount } from '@/widgets/NameResolver';
import { FeeWithLabel, MultisigDepositFee } from '@/widgets/transaction-fee';
import { MultisigExistsAlert } from '../../common/MultisigExistsAlert';
import { MultisigOperationDescriptionField } from '../../common/MultisigOperationDescriptionField';
import { SigningPathConfirmSection } from '../../common/SigningPathConfirmSection';
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

  const confirms = useUnit(confirmModel.$confirms);
  const confirmStore = useStoreMap({
    store: confirmModel.$confirmStore,
    keys: [id],
    fn: (confirms, [id]) => confirms[id],
  });

  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);

  if (!confirmStore) {
    return null;
  }

  const { chain, signatory, spawner, delegate, proxyType, route, fee, multisigDeposit, signingPath } =
    confirmStore.meta;
  const proxyAccount = spawner || delegate;
  const initiators = confirms.map((confirm) => confirm.meta.initiator);

  const hasMultisigAccount = route.some(accountUtils.isAnyMultisigAccount);

  const nativeAsset = getNativeAsset(chain.assets);

  return (
    <div className="flex flex-col items-center gap-y-4 px-5 pt-4 pb-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon name="proxyConfirm" size={60} />
      </div>

      <MultisigExistsAlert active={isMultisigExists} />

      <SigningPathConfirmSection
        signingPath={signingPath}
        chain={chain}
        wallets={wallets}
        initiators={initiators}
        signatory={signatory}
      >
        <DetailRow label={t('proxy.details.accessType')} className="pr-2">
          <FootnoteText>{proxyType}</FootnoteText>
        </DetailRow>

        <DetailRow label={t('proxy.details.revokeFor')} className="text-text-secondary">
          {proxyAccount && <NamedAccount accountId={proxyAccount} chain={chain} variant="short" />}
        </DetailRow>

        <hr className="w-full border-filter-border pr-2" />

        {hasMultisigAccount && <MultisigDepositFee asset={nativeAsset} multisigDeposit={multisigDeposit} />}

        <FeeWithLabel asset={nativeAsset} fee={fee} />
      </SigningPathConfirmSection>

      <MultisigOperationDescriptionField />

      <div className="mt-3 flex w-full justify-between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}

        <div className="flex gap-4">
          {!hideSignButton && secondaryActionButton}

          {!hideSignButton && (
            <SignButton
              isDefault={nonNullable(secondaryActionButton)}
              type={confirmStore.wallets.signatory.type}
              onClick={confirmModel.startSigning}
            />
          )}
        </div>
      </div>
    </div>
  );
};
