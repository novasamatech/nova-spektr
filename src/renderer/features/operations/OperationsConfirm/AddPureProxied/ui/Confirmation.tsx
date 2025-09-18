import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { getNativeAsset } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { Fee, FeeWithLabel, MultisigDepositFee } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';
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

  const { chain, signatory, proxyDeposit, fee, multisigDeposit, route } = confirmStore.meta;
  const initiators = confirms.map((confirm) => confirm.meta.initiator);

  const hasAnyMultisigAccount = route.some(accountUtils.isAnyMultisigAccount);

  const nativeAsset = getNativeAsset(chain.assets);

  return (
    <div className="flex w-modal flex-col items-center gap-y-4 px-5 pt-4 pb-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name="proxyConfirm" size={60} />
      </div>

      <MultisigExistsAlert active={isMultisigExists} />

      <TransactionDetails chain={chain} wallets={wallets} initiators={initiators} signatory={signatory}>
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
          <Fee fee={proxyDeposit} asset={nativeAsset} />
        </DetailRow>

        {hasAnyMultisigAccount && <MultisigDepositFee asset={nativeAsset} multisigDeposit={multisigDeposit} />}

        <FeeWithLabel fee={fee} asset={nativeAsset} />
      </TransactionDetails>

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
              type={confirmStore.wallets.signatory.type}
              onClick={confirmModel.startSigning}
            />
          )}
        </div>
      </div>
    </div>
  );
};
