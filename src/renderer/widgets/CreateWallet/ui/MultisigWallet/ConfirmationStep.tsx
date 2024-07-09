import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { cnTw, RootExplorers } from '@shared/lib/utils';
import { useI18n } from '@app/providers';
import { BodyText, Button, FootnoteText, SmallTitleText } from '@shared/ui';
import { WalletItem } from './components/WalletItem';
import { ContactItem, ExplorersPopover } from '@entities/wallet';
import { Chain, WalletType } from '@shared/core';
import { flowModel } from '../../model/flow-model';
import { Step } from '../../lib/types';
import { formModel } from '../../model/form-model';
import { FeeWithLabel, MultisigDepositWithLabel } from '@entities/transaction';
import { SignButton } from '@entities/operations';
import { confirmModel } from '../../model/confirm-model';
import { signatoryModel } from '../../model/signatory-model';

type Props = {
  chain?: Chain;
};

export const ConfirmationStep = ({ chain }: Props) => {
  const { t } = useI18n();
  const signatoriesMap = useUnit(signatoryModel.$signatories);
  const signatories = Array.from(signatoriesMap.values());
  const signerWallet = useUnit(flowModel.$signerWallet);
  const signatoriesWithoutSelf = signatories.slice(1);
  const {
    fields: { name, threshold },
  } = useForm(formModel.$createMultisigForm);
  const api = useUnit(flowModel.$api);
  const fakeTx = useUnit(flowModel.$fakeTx);

  const explorers = chain ? chain.explorers : RootExplorers;

  return (
    <section className="relative flex flex-col px-5 py-4 flex-1 bg-input-background-disabled h-full">
      <div className={cnTw('max-h-full flex flex-col flex-1')}>
        {/* {signatories.length > 1 && (
          <>
            <SmallTitleText className="py-2">{t('createMultisigAccount.signingWith')}</SmallTitleText>
            <ExplorersPopover
              address={signatories[0].address}
              explorers={explorers}
              button={<ContactItem name={''} address={signatories[0].address} />}
            />
          </>
        )} */}

        <SmallTitleText className="py-2">{t('createMultisigAccount.newMultisigTitle')}</SmallTitleText>
        <WalletItem className="py-2 mb-4" name={name.value} type={WalletType.MULTISIG} />

        <SmallTitleText className="py-2">{t('createMultisigAccount.thresholdName')}</SmallTitleText>
        <BodyText as="span" className="text-text-secondary tracking-tight truncate mb-4">
          {threshold.value}/{signatories.length}
        </BodyText>

        <SmallTitleText className="py-2">{t('createMultisigAccount.selectedSignatoriesTitle')}</SmallTitleText>
        <div className="flex flex-col gap-y-2 flex-1 overflow-y-auto">
          <>
            <FootnoteText className="text-text-tertiary">{t('createMultisigAccount.walletsTab')}</FootnoteText>
            <ul className="flex flex-col gap-y-2">
              <li className="py-1.5 px-1 rounded-md hover:bg-action-background-hover">
                <WalletItem name={signerWallet?.name || ''} type={signerWallet?.type || WalletType.POLKADOT_VAULT} />
              </li>
            </ul>
          </>
          {signatoriesWithoutSelf.length > 0 && (
            <>
              <FootnoteText className="text-text-tertiary">
                {t('createMultisigAccount.contactsTab')} <span className="ml-2">{signatoriesWithoutSelf.length}</span>
              </FootnoteText>
              <ul className="gap-y-2">
                {signatoriesWithoutSelf.map(({ address, name }) => (
                  <li key={address} className="p-1 rounded-md hover:bg-action-background-hover">
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
        <div className="flex flex-col gap-y-2 my-2 flex-1">
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
        <div className="flex justify-between items-center mt-auto">
          <Button variant="text" onClick={() => flowModel.events.stepChanged(Step.SIGNATORIES_THRESHOLD)}>
            {t('createMultisigAccount.backButton')}
          </Button>
          <SignButton type={signerWallet!.type} onClick={confirmModel.output.formSubmitted} />
        </div>
      </div>
    </section>
  );
};
