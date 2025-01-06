import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Step, nonNullable } from '@/shared/lib/utils';
import { Button, FootnoteText, InputHint, SmallTitleText } from '@/shared/ui';
import { Box, Field, Input, Modal, Select } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { networkModel, networkUtils } from '@/entities/network';
import { flowModel } from '../model/flow-model';
import { formModel } from '../model/form-model';

import { MultisigCreationFees } from './components';

interface Props {
  onGoBack: () => void;
}

export const NameNetworkSelection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const api = useUnit(flowModel.$api);
  const fakeTx = useUnit(flowModel.$fakeTx);
  const chains = useUnit(networkModel.$chains);
  const chain = useUnit(formModel.$chain);

  const {
    fields: { name, chainId, threshold },
  } = useForm(formModel.$createMultisigForm);

  const isNameError = name.isTouched && !name.value;
  const asset = chain?.assets.at(0);

  return (
    <>
      <Modal.Content>
        <section className="flex h-full w-full flex-col">
          <div className="border-b border-container-border px-5 pb-6 text-text-primary">
            <SmallTitleText>
              {t('createMultisigAccount.multisigStep', { step: 1 })} {t('createMultisigAccount.nameNetworkDescription')}
            </SmallTitleText>
          </div>
          <form id="multisigForm" className="flex h-full flex-col gap-y-6 px-5 py-6">
            <Box width="360px">
              <Field text={t('createMultisigAccount.walletNameLabel')}>
                <Input
                  autoFocus
                  height="md"
                  placeholder={t('createMultisigAccount.namePlaceholder')}
                  invalid={isNameError}
                  value={name.value}
                  onChange={name.onChange}
                />

                <InputHint variant="error" active={isNameError}>
                  {t('createMultisigAccount.disabledError.emptyName')}
                </InputHint>
              </Field>
            </Box>
            <div className="grid grid-cols-2 items-end gap-x-6">
              <Field text={t('createMultisigAccount.chainName')}>
                <Select
                  placeholder={t('createMultisigAccount.chainPlaceholder')}
                  value={chainId.value}
                  onChange={value => chainId.onChange(value as ChainId)}
                >
                  {Object.values(chains)
                    .filter(c => networkUtils.isMultisigSupported(c.options))
                    .map(chain => (
                      <Select.Item key={chain.chainId} value={chain.chainId}>
                        <ChainTitle className="overflow-hidden" chain={chain} fontClass="text-text-primary truncate" />
                      </Select.Item>
                    ))}
                </Select>
              </Field>

              <FootnoteText className="text-text-tertiary">
                {t('createMultisigAccount.networkDescription')}
              </FootnoteText>
            </div>
          </form>
        </section>
      </Modal.Content>
      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
          <Button variant="text" onClick={onGoBack}>
            {t('createMultisigAccount.backButton')}
          </Button>

          <div className="flex items-center justify-end gap-x-6">
            {nonNullable(asset) ? (
              <MultisigCreationFees api={api} asset={asset} threshold={threshold.value} transaction={fakeTx} />
            ) : null}

            <Button
              key="create"
              disabled={isNameError || !name.isTouched}
              onClick={() => flowModel.events.stepChanged(Step.SIGNATORIES_THRESHOLD)}
            >
              {t('createMultisigAccount.continueButton')}
            </Button>
          </div>
        </Box>
      </Modal.Footer>
    </>
  );
};
