import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Step } from '@/shared/lib/utils';
import { BodyText, Button, Counter, DetailRow, Icon, IconButton, Separator } from '@/shared/ui';
import { SignButton } from '@/entities/operations';
import { FeeWithLabel, MultisigDepositWithLabel, ProxyDepositWithLabel } from '@/entities/transaction';
import { WalletIcon } from '@/entities/wallet';
import { confirmModel } from '../model/confirm-model';
import { flexibleMultisigModel } from '../model/flexible-multisig-create';
import { formModel } from '../model/form-model';
import { signatoryModel } from '../model/signatory-model';

import { SelectedSignatoriesModal } from './SelectedSignatoriesModal';

export const ConfirmationStep = () => {
  const { t } = useI18n();

  const signerWallet = useUnit(flexibleMultisigModel.$signerWallet);
  const signer = useUnit(flexibleMultisigModel.$signer);
  const api = useUnit(flexibleMultisigModel.$api);
  const transaction = useUnit(flexibleMultisigModel.$transaction);

  const signatoriesMap = useUnit(signatoryModel.$signatories);
  const signatories = Array.from(signatoriesMap.values());
  const ownedSignatories = useUnit(signatoryModel.$ownedSignatoriesWallets);
  const {
    fields: { name, threshold, chain },
  } = useForm(formModel.$createMultisigForm);

  const walletName = signer?.name || (signerWallet?.type === WalletType.POLKADOT_VAULT && signerWallet?.name) || '';

  return (
    <section className="relative flex h-full flex-1 flex-col px-5 py-4">
      <div className="flex max-h-full flex-1 flex-col">
        <div className="mb-6 flex flex-col items-center">
          <Icon className="text-icon-default" name="multisigCreationConfirm" size={60} />
        </div>
        <DetailRow wrapperClassName="mb-8" label={t('createMultisigAccount.walletName')}>
          {name.value}
        </DetailRow>
        <DetailRow wrapperClassName="mb-8" label={t('createMultisigAccount.signatoriesLabel')}>
          <SelectedSignatoriesModal signatories={signatories} addressPrefix={chain.value.addressPrefix}>
            <div className="flex items-center">
              <Counter className="mr-2" variant="neutral">
                {signatories.length}
              </Counter>
              <IconButton name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
            </div>
          </SelectedSignatoriesModal>
        </DetailRow>
        <DetailRow wrapperClassName="mb-8" label={t('createMultisigAccount.thresholdName')}>
          {t('createMultisigAccount.thresholdOutOf', {
            threshold: threshold.value,
            signatoriesLength: signatories.length,
          })}
        </DetailRow>
        <Separator className="border-filter-border" />
        <DetailRow wrapperClassName="my-4" label={t('createMultisigAccount.signingWallet')}>
          <div className="flex w-full items-center justify-end gap-x-2">
            <WalletIcon type={signerWallet?.type || WalletType.POLKADOT_VAULT} />

            <div className="flex max-w-[348px] flex-col">
              <BodyText as="span" className="truncate tracking-tight text-text-secondary">
                {walletName}
              </BodyText>
            </div>
          </div>
        </DetailRow>
        <Separator className="border-filter-border" />
        <div className="my-2 mb-8 flex flex-1 flex-col gap-y-2">
          <ProxyDepositWithLabel
            asset={chain.value.assets[0]}
            proxyNumber={1}
            deposit="0"
            api={api}
            className="text-footnote"
          />
          <MultisigDepositWithLabel
            className="text-footnote"
            asset={chain.value.assets[0]}
            threshold={threshold.value}
            api={api}
          />
          <FeeWithLabel api={api} asset={chain.value.assets[0]} transaction={transaction?.wrappedTx} />
        </div>

        <div className="mt-auto flex items-center justify-between">
          <Button
            variant="text"
            onClick={() => {
              return (ownedSignatories || []).length > 1
                ? flexibleMultisigModel.events.stepChanged(Step.SIGNER_SELECTION)
                : flexibleMultisigModel.events.stepChanged(Step.SIGNATORIES_THRESHOLD);
            }}
          >
            {t('createMultisigAccount.backButton')}
          </Button>
          <SignButton
            type={signerWallet?.type || WalletType.POLKADOT_VAULT}
            onClick={confirmModel.output.formSubmitted}
          />
        </div>
      </div>
    </section>
  );
};
