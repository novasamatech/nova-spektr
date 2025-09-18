import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { getNativeAsset, toAccountId } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { Account, TransactionDetails } from '@/shared/ui-entities';
import { SignButton } from '@/entities/operations';
import { proxyUtils } from '@/entities/proxy';
import { Fee, FeeWithLabel, MultisigDepositFee, ProxyDepositLabel } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';
import { MultisigExistsAlert } from '../../common/MultisigExistsAlert';
import { confirmModel } from '../model/confirm-model';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
};

export const Confirmation = ({ id = 0, onGoBack, secondaryActionButton, hideSignButton }: Props) => {
  const { t } = useI18n();
  const wallets = useUnit(walletModel.$wallets);
  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);
  const confirms = useUnit(confirmModel.$confirms);
  const confirm = useStoreMap({
    store: confirmModel.$confirmStore,
    keys: [id],
    fn: (value, [id]) => value[id],
  });

  if (!confirm || !confirm.wallets.initiator) {
    return null;
  }

  const { route, chain, signatory, delegate, proxyType, proxyDeposit, multisigDeposit, fee } = confirm.meta;

  const isAnyMultisigAccount = route.some(accountUtils.isAnyMultisigAccount);

  const nativeAsset = getNativeAsset(chain.assets);

  const initiators = confirms.map((confirm) => confirm.meta.initiator);

  return (
    <div className="flex w-modal flex-col items-center gap-y-4 px-5 pt-4 pb-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon name="proxyConfirm" size={60} />
      </div>

      <MultisigExistsAlert active={isMultisigExists} />

      <TransactionDetails chain={chain} wallets={wallets} initiators={initiators} signatory={signatory}>
        <DetailRow label={t('proxy.details.grantAccessType')} className="pr-2">
          <FootnoteText>{t(proxyUtils.getProxyTypeName(proxyType))}</FootnoteText>
        </DetailRow>

        <DetailRow label={t('proxy.details.delegateTo')} className="text-text-secondary">
          <Account accountId={toAccountId(delegate)} chain={chain} variant="short" />
        </DetailRow>

        <hr className="w-full border-filter-border pr-2" />

        <ProxyDepositLabel>
          <Fee fee={proxyDeposit} asset={nativeAsset} />
        </ProxyDepositLabel>

        {isAnyMultisigAccount && <MultisigDepositFee asset={nativeAsset} multisigDeposit={multisigDeposit} />}

        <FeeWithLabel asset={nativeAsset} fee={fee} />
      </TransactionDetails>

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
              type={confirm.wallets.signatory.type}
              onClick={confirmModel.startSigning}
            />
          )}
        </div>
      </div>
    </div>
  );
};
