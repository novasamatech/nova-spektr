import { useState } from 'react';

import { type Address, type Chain, CryptoType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, FootnoteText, IconButton } from '@/shared/ui';
import { Address as AddressDisplay, Identicon } from '@/shared/ui-entities';
import { networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { type SelectedTarget } from '../../types';

type Props = {
  chain: Chain;
  initialSignatories: AccountId[];
  initialThreshold: number;
  onChange: (target: Extract<SelectedTarget, { kind: 'modify' }> | null) => void;
};

export const ModifyCurrentForm = ({ chain, initialSignatories, initialThreshold, onChange }: Props) => {
  const { t } = useI18n();
  const [signatories, setSignatories] = useState<AccountId[]>(initialSignatories);
  const [threshold, setThreshold] = useState<number>(initialThreshold);

  const cryptoType = networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519;

  function propagate(s: AccountId[], th: number) {
    const valid = s.length >= 2 && th >= 1 && th <= s.length;
    if (!valid) return onChange(null);
    const id = accountUtils.getMultisigAccountId(s, th, cryptoType);
    onChange({
      kind: 'modify',
      signatories: s,
      threshold: th,
      derivedAddress: toAddress(id, { prefix: chain.addressPrefix }),
    });
  }

  const handleRemoveSignatory = (index: number) => {
    const next = signatories.filter((_, i) => i !== index);
    const clampedThreshold = Math.min(threshold, Math.max(1, next.length));
    setSignatories(next);
    setThreshold(clampedThreshold);
    propagate(next, clampedThreshold);
  };

  const handleThresholdChanged = (next: number) => {
    setThreshold(next);
    propagate(signatories, next);
  };

  const isValid = signatories.length >= 2 && threshold >= 1 && threshold <= signatories.length;
  const derivedAddress: Address | null = isValid
    ? toAddress(accountUtils.getMultisigAccountId(signatories, threshold, cryptoType), {
        prefix: chain.addressPrefix,
      })
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Signatories section */}
      <div className="flex flex-col gap-2">
        <FootnoteText className="text-text-secondary">
          {t('flexibleMultisig.editController.modifyCurrent.signatoriesLabel')}
        </FootnoteText>

        <div className="flex flex-col gap-1">
          {signatories.map((accountId, index) => {
            const displayAddress = toAddress(accountId, { prefix: chain.addressPrefix });

            return (
              <div
                key={accountId}
                className="flex items-center justify-between rounded-md bg-input-background px-3 py-2"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Identicon address={displayAddress} size={20} background={false} />
                  <AddressDisplay address={displayAddress} variant="short" />
                </div>

                <IconButton
                  name="delete"
                  size={16}
                  ariaLabel={t('flexibleMultisig.editController.modifyCurrent.removeSignatory')}
                  onClick={() => handleRemoveSignatory(index)}
                />
              </div>
            );
          })}
        </div>

        {/* TODO: wire up signatory picker (Task 7+) */}
        <Button variant="text" size="sm" onClick={() => {}}>
          {t('flexibleMultisig.editController.modifyCurrent.addSignatory')}
        </Button>
      </div>

      {/* Threshold section */}
      <div className="flex flex-col gap-2">
        <FootnoteText className="text-text-secondary">
          {t('flexibleMultisig.editController.modifyCurrent.thresholdLabel')}
        </FootnoteText>

        <input
          type="number"
          className="w-20 rounded-md border border-divider bg-input-background px-3 py-1.5 text-text-primary focus:border-active-container-border focus:outline-none"
          min={1}
          max={signatories.length}
          value={threshold}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) handleThresholdChanged(val);
          }}
        />
      </div>

      {/* Derived address preview */}
      <div className="flex flex-col gap-1">
        <FootnoteText className="text-text-secondary">
          {t('flexibleMultisig.editController.modifyCurrent.derivedNote')}
        </FootnoteText>

        {derivedAddress ? (
          <div className="flex items-center gap-2 rounded-md bg-input-background px-3 py-2">
            <Identicon address={derivedAddress} size={20} background={false} />
            <AddressDisplay address={derivedAddress} variant="short" />
          </div>
        ) : (
          <FootnoteText className="text-text-tertiary">—</FootnoteText>
        )}
      </div>
    </div>
  );
};
