import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { Button, FootnoteText, Input, InputHint, SmallTitleText } from '@/shared/ui';
import { Box, Field, Select } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { networkModel, networkUtils } from '@/entities/network';
import { Step } from '../../lib/types';
import { flowModel } from '../../model/flow-model';
import { formModel } from '../../model/form-model';

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
    <section className="flex h-full flex-1 flex-col">
      <SmallTitleText className="mb-4 border-b border-container-border px-5 pb-4 text-text-primary">
        {t('createMultisigAccount.multisigStep', { step: 1 })} {t('createMultisigAccount.nameNetworkDescription')}
      </SmallTitleText>
      <form id="multisigForm" className="flex h-full flex-col gap-y-4 px-5 pb-6">
        <div className="flex items-end gap-x-4">
          <Input
            autoFocus
            className="w-[360px]"
            placeholder={t('createMultisigAccount.namePlaceholder')}
            label={t('createMultisigAccount.walletNameLabel')}
            invalid={isNameError}
            value={name.value}
            onChange={name.onChange}
          />
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
                      <ChainTitle className="overflow-hidden" chain={chain} fontClass="text-text-primary truncate" />
                    </Select.Item>
                  ))}
              </Select>
            </Field>
          </Box>
          <FootnoteText className="mt-2 text-text-tertiary">
            {t('createMultisigAccount.networkDescription')}
          </FootnoteText>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <Button variant="text" onClick={onGoBack}>
            {t('createMultisigAccount.backButton')}
          </Button>
          <div className="mt-auto flex items-center justify-end">
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
        </div>
      </form>
    </section>
  );
};
