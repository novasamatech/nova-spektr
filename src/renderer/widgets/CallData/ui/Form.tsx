import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';
import ReactJson from 'react-json-view';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { Button, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Input, Select } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { callDataModel } from '../model/call-data';
import { formModel } from '../model/form-model';

type Props = {
  onGoBack: () => void;
};

export const Form = ({ onGoBack }: Props) => {
  const { submit } = useForm(formModel.form);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
        <ChainSelector />
        <CallData />
      </form>
      <div className="flex flex-col gap-y-6 pb-4 pt-6">{/* <FeeSection /> */}</div>
      <ActionsSection onGoBack={onGoBack} />
    </div>
  );
};

const CallData = () => {
  const { t } = useI18n();

  const {
    fields: { callData },
  } = useForm(formModel.form);

  const decodedTx = useUnit(formModel.$decodedTx);

  console.log('decodedTx', decodedTx);

  console.log(callData.errorMessage);

  return (
    <section>
      <FootnoteText className="mb-2 text-text-tertiary">{t('callData.callData')}</FootnoteText>
      <Input value={callData.value} placeholder={t('callData.placeholder')} onChange={callData.onChange} />

      <div className="border-border-secondary my-6 w-full border-b" />

      {decodedTx && (
        <div className="flex flex-col gap-y-3">
          <SmallTitleText>{t('callData.isCorrect')}</SmallTitleText>
          <ReactJson src={decodedTx} enableClipboard={false} />
        </div>
      )}
      {!decodedTx && (
        <div className="flex flex-col items-center gap-y-2 px-10 py-28">
          <Icon size={64} name="empty" className="mb-4" />
          <SmallTitleText>{t('callData.noDecodedTxTitle')}</SmallTitleText>
          <FootnoteText className="text-text-tertiary">{t('callData.noDecodedTxDescription')}</FootnoteText>
        </div>
      )}
    </section>
  );
};

export const ChainSelector = () => {
  const { t } = useI18n();

  const selectedChainId = useUnit(callDataModel.$selectedChainId);
  const availableChains = useUnit(callDataModel.$availableChains);

  return (
    <section>
      <FootnoteText className="mb-2 text-text-tertiary">{t('callData.network')}</FootnoteText>
      <Select
        placeholder={t('proxy.addProxy.networkPlaceholder')}
        value={selectedChainId}
        height="sm"
        onChange={callDataModel.events.selectChain}
      >
        {availableChains.map((chain) => (
          <Select.Item key={chain.chainId} value={chain.chainId}>
            <ChainTitle className="overflow-hidden" fontClass="text-text-primary truncate" chain={chain} />
          </Select.Item>
        ))}
      </Select>
    </section>
  );
};

// const FeeSection = () => {
//   const { t } = useI18n();

//   const {
//     fields: { initiator },
//   } = useForm(formModel.form);

//   const network = useUnit(formModel.$networkStore);
//   const fee = useUnit(formModel.$fee);
//   const multisigDeposit = useUnit(formModel.$multisigDeposit);
//   const isFeeLoading = useUnit(formModel.$pendingFee);
//   const isMultisig = useUnit(formModel.$isMultisig);

//   if (!network || !initiator.value) {
//     return null;
//   }

//   return (
//     <div className="flex flex-col gap-y-2">
//       {isMultisig && (
//         <DetailRow
//           className="text-text-primary"
//           label={
//             <>
//               <Icon className="text-text-tertiary" name="lock" size={12} />
//               <FootnoteText className="text-text-tertiary">{t('staking.multisigDepositLabel')}</FootnoteText>
//               <Tooltip>
//                 <Tooltip.Trigger>
//                   <div tabIndex={0}>
//                     <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
//                   </div>
//                 </Tooltip.Trigger>
//                 <Tooltip.Content>{t('staking.tooltips.depositDescription')}</Tooltip.Content>
//               </Tooltip>
//             </>
//           }
//         >
//           <Fee fee={multisigDeposit.toString()} asset={network.asset} />
//         </DetailRow>
//       )}

//       <FeeWithLabel fee={fee.toString()} isLoading={isFeeLoading} asset={network.asset} />
//     </div>
//   );
// };

const ActionsSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);

  return (
    <div className="mt-4 flex items-center justify-between">
      <Button variant="text" onClick={onGoBack}>
        {t('operation.goBackButton')}
      </Button>
      <Button form="transfer-form" type="submit" disabled={!canSubmit}>
        {t('transfer.continueButton')}
      </Button>
    </div>
  );
};
