import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { type Address, type Chain, CryptoType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAccountId, toAddress, validateAddress } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, InputHint } from '@/shared/ui';
import { Box, Field, Select } from '@/shared/ui-kit';
import { networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { signatoryModel } from '../../model/signatory-model';
import { type SelectedTarget } from '../../types';

import { Signatory } from './Signatory';

type Props = {
  active: boolean;
  chain: Chain;
  currentControllerAddress: Address;
  initialThreshold: number;
  onChange: (target: Extract<SelectedTarget, { kind: 'modify' }> | null) => void;
};

export const ModifyCurrentForm = ({ active, chain, currentControllerAddress, initialThreshold, onChange }: Props) => {
  const { t } = useI18n();
  const signatories = useUnit(signatoryModel.$signatories);
  const duplicateSignatories = useUnit(signatoryModel.$duplicateSignatories);
  const hasDuplicates = useUnit(signatoryModel.$hasDuplicateSignatories);
  const hasEmpty = useUnit(signatoryModel.$hasEmptySignatories);
  const [threshold, setThreshold] = useState<number>(initialThreshold);

  const cryptoType = networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519;

  // Clamp threshold when number of signatories shrinks below it
  useEffect(() => {
    if (signatories.length === 0) return;
    if (threshold > signatories.length) setThreshold(signatories.length);
    if (threshold < 1) setThreshold(1);
  }, [signatories.length, threshold]);

  // Sync derived target up to parent. Effector store changes flow asynchronously
  // through events from the Signatory component, so a useEffect bridge is the
  // right place to reflect those changes back as a parent callback invocation.
  // Skip when the tab isn't active so we don't clobber a Replace-tab selection.
  useEffect(() => {
    if (!active) return;
    const allValid = !hasDuplicates && !hasEmpty && signatories.every((s) => validateAddress(s.address, chain));
    const enoughSignatories = signatories.length >= 2;
    const validThreshold = threshold >= 1 && threshold <= signatories.length;

    if (!allValid || !enoughSignatories || !validThreshold) {
      onChange(null);
      return;
    }

    const accountIds = signatories.map((s) => toAccountId(s.address));
    const id = accountUtils.getMultisigAccountId(accountIds, threshold, cryptoType);
    const derivedAddress: Address = toAddress(id, { prefix: chain.addressPrefix });

    // Don't propagate when nothing actually changed — derived multisig matches
    // the current one. Keeps the banner in its empty hint state and disables Next.
    if (toAccountId(derivedAddress) === toAccountId(currentControllerAddress)) {
      onChange(null);
      return;
    }

    onChange({ kind: 'modify', signatories: accountIds, threshold, derivedAddress });
  }, [active, signatories, threshold, hasDuplicates, hasEmpty, chain, cryptoType, currentControllerAddress, onChange]);

  const minThreshold = signatories.length >= 2 ? 2 : 1;
  const thresholdDisabled = signatories.length < 2;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <FootnoteText className="text-text-secondary">
          {t('flexibleMultisig.editProxy.modifyCurrent.signatoriesLabel')}
        </FootnoteText>

        {signatories.map((signatory, index) => (
          <Signatory
            key={index}
            isDuplicate={duplicateSignatories[toAccountId(signatory.address)]?.includes(index) ?? false}
            isInvalidAddress={signatory.address.length > 0 && !validateAddress(signatory.address, chain)}
            signatoryIndex={index}
            signatory={signatory}
            onDelete={signatories.length > 2 ? signatoryModel.deleteSignatory : undefined}
          />
        ))}

        <Button
          size="md"
          variant="text"
          className="h-8.5 w-max justify-center gap-x-1 pl-0"
          suffixElement={<Icon className="text-icon-primary" name="add" size={16} />}
          onClick={() => signatoryModel.addSignatory({ address: '', walletId: '' })}
        >
          {t('flexibleMultisig.editProxy.modifyCurrent.addSignatory')}
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        <Box width="232px">
          <Field text={t('flexibleMultisig.editProxy.modifyCurrent.thresholdLabel')}>
            <Select
              placeholder={t('flexibleMultisig.editProxy.modifyCurrent.thresholdLabel')}
              value={threshold ? threshold.toString() : ''}
              disabled={thresholdDisabled}
              height="md"
              onChange={(value) => setThreshold(Number(value))}
            >
              {Array.from({ length: Math.max(0, signatories.length - 1) }, (_, i) => {
                const value = i + minThreshold;
                return (
                  <Select.Item key={value} value={value.toString()}>
                    {value}
                  </Select.Item>
                );
              })}
            </Select>
          </Field>
        </Box>
        <InputHint active={!thresholdDisabled && threshold >= 1} variant="hint">
          {t('flexibleMultisig.editProxy.modifyCurrent.thresholdHint', {
            threshold,
            total: signatories.length,
          })}
        </InputHint>
        <InputHint active={thresholdDisabled} variant="hint">
          {t('flexibleMultisig.editProxy.modifyCurrent.notEnoughSignatories')}
        </InputHint>
        <InputHint active={hasDuplicates} variant="error">
          {t('flexibleMultisig.editProxy.modifyCurrent.duplicateSignatories')}
        </InputHint>
        <InputHint active={hasEmpty && !thresholdDisabled} variant="error">
          {t('flexibleMultisig.editProxy.modifyCurrent.emptySignatories')}
        </InputHint>
      </div>
    </div>
  );
};
