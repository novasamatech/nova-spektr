import { useUnit } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { Step } from '@/shared/lib/utils';
import { Button, FootnoteText, InputHint, SmallTitleText } from '@/shared/ui';
import { Box, Field, Input, Modal, Select } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { flexibleMultisigModel } from '../model/flexible-multisig-create';
import { formModel } from '../model/form-model';

import { MultisigFees } from './components/MultisigFees';

interface Props {
  onGoBack: () => void;
}

export const NameNetworkSelection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(formModel.$multisigChains);

  const {
    fields: { name, chainId },
  } = useForm(formModel.form);

  return (
    <>
      <Modal.Content>
        <section className="flex h-full w-modal-lg flex-1 flex-col gap-y-6 px-5">
          <SmallTitleText>
            {t('createMultisigAccount.multisigStep', { step: 1 })}{' '}
            {t('createMultisigAccount.flexibleMultisig.nameNetworkDescription')}
          </SmallTitleText>

          <hr className="-ml-5 w-[110%] border-divider" />

          <form id="multisigForm" className="flex h-full flex-col gap-y-6">
            <div className="flex max-w-[360px] items-end gap-x-4">
              <Box width="360px">
                <Field text={t('createMultisigAccount.walletName')}>
                  <Input
                    autoFocus
                    placeholder={t('createMultisigAccount.namePlaceholder')}
                    invalid={name.hasError}
                    value={name.value}
                    onChange={name.onChange}
                  />
                </Field>
              </Box>
              <InputHint variant="error" active={name.hasError}>
                {t(name.errorMessage)}
              </InputHint>
            </div>
            <div className="flex items-end gap-x-4">
              <Box width="100%">
                <Field text={t('createMultisigAccount.chainName')}>
                  <Select
                    placeholder={t('createMultisigAccount.chainPlaceholder')}
                    value={chainId.value}
                    onChange={value => chainId.onChange(value as ChainId)}
                  >
                    {chains.map(chain => (
                      <Select.Item key={chain.chainId} value={chain.chainId}>
                        <ChainTitle className="overflow-hidden" chain={chain} fontClass="text-text-primary truncate" />
                      </Select.Item>
                    ))}
                  </Select>
                </Field>
              </Box>
              <FootnoteText className="mt-2 text-text-tertiary">
                {t('createMultisigAccount.flexibleMultisig.networkDescription')}
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
            <MultisigFees />

            <Button
              key="create"
              disabled={name.hasError || name.value.trim() === ''}
              onClick={() => flexibleMultisigModel.stepChanged(Step.SIGNATORIES_THRESHOLD)}
            >
              {t('createMultisigAccount.continueButton')}
            </Button>
          </div>
        </Box>
      </Modal.Footer>
    </>
  );
};
