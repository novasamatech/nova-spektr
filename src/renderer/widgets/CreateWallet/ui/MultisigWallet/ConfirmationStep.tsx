import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { type Chain, WalletType } from '@shared/core';
import { RootExplorers } from '@shared/lib/utils';
import { BodyText, Button, FootnoteText, SmallTitleText } from '@shared/ui';
import { SignButton } from '@entities/operations';
import { FeeWithLabel, MultisigDepositWithLabel } from '@entities/transaction';
import { ContactItem, ExplorersPopover } from '@entities/wallet';
import { Step } from '../../lib/types';
import { confirmModel } from '../../model/confirm-model';
import { flowModel } from '../../model/flow-model';
import { formModel } from '../../model/form-model';
import { signatoryModel } from '../../model/signatory-model';

import { WalletItem } from './components/WalletItem';

type Props = {
  chain?: Chain;
};

export const ConfirmationStep = ({ chain }: Props) => {
  const { t } = useI18n();
  const signatoriesMap = useUnit(signatoryModel.$signatories);
  const signatories = Array.from(signatoriesMap.values());
  const signerWallet = useUnit(flowModel.$signerWallet);
  const signer = useUnit(flowModel.$signer);
  const signatoriesWithoutSelf = signatories.slice(1);
  const {
    fields: { name, threshold },
  } = useForm(formModel.$createMultisigForm);
  const api = useUnit(flowModel.$api);
  const fakeTx = useUnit(flowModel.$fakeTx);

  const explorers = chain ? chain.explorers : RootExplorers;

  return (
    <section className="relative flex h-full flex-1 flex-col bg-input-background-disabled px-5 py-4">
      <div className="flex max-h-full flex-1 flex-col">
        <SmallTitleText className="py-2">{t('createMultisigAccount.newMultisigTitle')}</SmallTitleText>
        <WalletItem className="mb-4 py-2" name={name.value} type={WalletType.MULTISIG} />

        <SmallTitleText className="py-2">{t('createMultisigAccount.thresholdName')}</SmallTitleText>
        <BodyText as="span" className="mb-4 truncate tracking-tight text-text-secondary">
          {threshold.value}/{signatories.length}
        </BodyText>

        <SmallTitleText className="py-2">{t('createMultisigAccount.selectedSignatoriesTitle')}</SmallTitleText>
        <div className="flex flex-1 flex-col gap-y-2 overflow-y-auto">
          <FootnoteText className="text-text-tertiary">{t('createMultisigAccount.walletsTab')}</FootnoteText>
          <ul className="flex flex-col gap-y-2">
            <li className="rounded-md px-1 py-1.5 hover:bg-action-background-hover">
              <WalletItem name={signer?.name || ''} type={signerWallet?.type || WalletType.POLKADOT_VAULT} />
            </li>
          </ul>
          {signatoriesWithoutSelf.length > 0 && (
            <>
              <FootnoteText className="text-text-tertiary">
                {t('createMultisigAccount.contactsTab')} <span className="ml-2">{signatoriesWithoutSelf.length}</span>
              </FootnoteText>
              <ul className="gap-y-2">
                {signatoriesWithoutSelf.map(({ address, name }) => (
                  <li key={address} className="rounded-md p-1 hover:bg-action-background-hover">
                    <ExplorersPopover
                      address={address}
                      explorers={explorers}
                      button={<ContactItem name={name} address={address} />}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="my-2 flex flex-1 flex-col gap-y-2">
          <MultisigDepositWithLabel
            api={api}
            asset={chain!.assets[0]}
            threshold={threshold.value}
            onDepositChange={flowModel.events.multisigDepositChanged}
          />
          <FeeWithLabel
            api={api}
            asset={chain!.assets[0]}
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
