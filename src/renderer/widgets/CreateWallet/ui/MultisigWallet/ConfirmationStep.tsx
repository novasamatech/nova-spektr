import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { WalletType } from '@shared/core';
import { RootExplorers } from '@shared/lib/utils';
import { Button, Counter, DetailRow, Icon, Separator, Tooltip } from '@shared/ui';
import { FeeWithLabel, MultisigDepositWithLabel } from '@/entities/transaction';
import { SignButton } from '@entities/operations';
import { ContactItem, ExplorersPopover } from '@entities/wallet';
import { Step } from '../../lib/types';
import { confirmModel } from '../../model/confirm-model';
import { flowModel } from '../../model/flow-model';
import { formModel } from '../../model/form-model';
import { signatoryModel } from '../../model/signatory-model';

import { WalletItem } from './components/WalletItem';

export const ConfirmationStep = () => {
  const { t } = useI18n();
  const signatoriesMap = useUnit(signatoryModel.$signatories);
  const signatories = Array.from(signatoriesMap.values());
  const signerWallet = useUnit(flowModel.$signerWallet);
  const signer = useUnit(flowModel.$signer);
  const {
    fields: { name, threshold, chain },
  } = useForm(formModel.$createMultisigForm);
  const api = useUnit(flowModel.$api);
  const fakeTx = useUnit(flowModel.$fakeTx);

  const explorers = chain.value ? chain.value.explorers : RootExplorers;

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
          <>
            <Counter className="mr-2" variant="neutral">
              {signatories.length}
            </Counter>
            <Tooltip
              content={signatories.map(({ address }) => (
                <ExplorersPopover
                  key={address}
                  address={address}
                  explorers={explorers}
                  button={<ContactItem address={address} />}
                />
              ))}
              offsetPx={-70}
            >
              <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
            </Tooltip>
          </>
        </DetailRow>
        <DetailRow wrapperClassName="mb-8" label={t('createMultisigAccount.thresholdName')}>
          {t('createMultisigAccount.thresholdOutOf', {
            threshold: threshold.value,
            signatoriesLength: signatories.length,
          })}
        </DetailRow>
        <Separator className="border-filter-border" />
        <DetailRow wrapperClassName="my-4" label={t('createMultisigAccount.signingWallet')}>
          <WalletItem
            name={signer?.name || (signerWallet?.type === WalletType.POLKADOT_VAULT && signerWallet?.name) || ''}
            type={signerWallet?.type || WalletType.POLKADOT_VAULT}
          />
        </DetailRow>
        <Separator className="border-filter-border" />
        <div className="my-2 mb-8 flex flex-1 flex-col gap-y-2">
          <MultisigDepositWithLabel
            api={api}
            asset={chain.value.assets[0]}
            threshold={threshold.value}
            onDepositChange={flowModel.events.multisigDepositChanged}
          />
          <FeeWithLabel
            api={api}
            asset={chain.value.assets[0]}
            transaction={fakeTx}
            onFeeChange={flowModel.events.feeChanged}
            onFeeLoading={flowModel.events.isFeeLoadingChanged}
          />
        </div>
        <div className="mt-auto flex items-center justify-between">
          <Button variant="text" onClick={() => flowModel.events.stepChanged(Step.SIGNATORIES_THRESHOLD)}>
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
