import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Step, nonNullable } from '@/shared/lib/utils';
import { Button, FootnoteText, InputHint, SmallTitleText } from '@/shared/ui';
import { Box, Field, Input, Modal, Select } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { networkModel, networkUtils } from '@/entities/network';
import { flexibleMultisigModel } from '../model/flexible-multisig-create';
import { formModel } from '../model/form-model';

import { MultisigFees } from './MultisigFees';

interface Props {
  onGoBack: () => void;
}

export const NameNetworkSelection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const chain = useUnit(formModel.$chain);

  const {
    fields: { name, chainId },
  } = useForm(formModel.$createMultisigForm);

  const isNameError = name.isTouched && !name.value;
  const asset = chain?.assets.at(0);

  return (
    <>
      <Modal.Content>
        <section className="flex h-full max-h-[594px] w-modal-lg flex-1 flex-col">
          <SmallTitleText className="mb-4 border-b border-container-border px-5 pb-4 text-text-primary">
            {t('createMultisigAccount.multisigStep', { step: 1 })} {t('createMultisigAccount.nameNetworkDescription')}
          </SmallTitleText>
          <form id="multisigForm" className="flex h-full flex-col gap-y-4 px-5 pb-6">
            <div className="flex items-end gap-x-4">
              <Box width="360px">
                <Field text={t('createMultisigAccount.walletNameLabel')}>
                  <Input
                    autoFocus
                    placeholder={t('createMultisigAccount.namePlaceholder')}
                    invalid={isNameError}
                    value={name.value}
                    onChange={name.onChange}
                  />
                </Field>
              </Box>
              <InputHint variant="error" active={isNameError}>
                {t('createMultisigAccount.disabledError.emptyName')}
              </InputHint>
            </div>
            <div className="flex items-end gap-x-4">
              <Box width="386px">
                <Field text={t('createMultisigAccount.chainName')}>
                  <Select
                    placeholder={t('createMultisigAccount.chainPlaceholder')}
                    value={chainId.value}
                    onChange={(value) => chainId.onChange(value as ChainId)}
                  >
                    {Object.values(chains)
                      .filter((c) => networkUtils.isMultisigSupported(c.options))
                      .map((chain) => (
                        <Select.Item key={chain.chainId} value={chain.chainId}>
                          <ChainTitle
                            className="overflow-hidden"
                            chain={chain}
                            fontClass="text-text-primary truncate"
                          />
                        </Select.Item>
                      ))}
                  </Select>
                </Field>
              </Box>
              <FootnoteText className="mt-2 text-text-tertiary">
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
            {nonNullable(asset) ? <MultisigFees asset={asset} /> : null}

            <Button
              key="create"
              disabled={isNameError || !name.isTouched}
              onClick={() => flexibleMultisigModel.events.stepChanged(Step.SIGNATORIES_THRESHOLD)}
            >
              {t('createMultisigAccount.continueButton')}
            </Button>
          </div>
        </Box>
      </Modal.Footer>
    </>
  );
};
