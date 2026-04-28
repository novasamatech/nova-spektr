import { useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { type Address, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, HelpText } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { SearchInput } from '@/shared/ui-kit';
import {
  type ContactCandidate,
  type MultisigCandidate,
  type WalletCandidate,
  multisigCandidates,
} from '@/aggregates/multisig-candidates';
import { changeSignatoriesModel } from '../../model/change-signatories-model';
import { type SelectedTarget } from '../../types';

import { ModifyCurrentForm } from './ModifyCurrentForm';

type Props = {
  chain: Chain;
  currentControllerAddress: Address;
  currentSignatories: AccountId[];
  currentThreshold: number;
};

export const UnifiedPicker = ({ chain, currentControllerAddress, currentSignatories, currentThreshold }: Props) => {
  const { t } = useI18n();
  const candidates = useUnit(multisigCandidates.$candidates);
  const [target, targetSelected] = useUnit([
    changeSignatoriesModel.$selectedTarget,
    changeSignatoriesModel.targetSelected,
  ]);
  const [search, setSearch] = useState('');
  // Local UI state — kept independent of $selectedTarget on purpose. Clicking
  // the toggle reveals/hides the modify form; selection is driven by the
  // form's onChange (or by selecting an existing candidate below).
  const [modifyExpanded, setModifyExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return candidates.filter(
      (c) =>
        c.address !== currentControllerAddress &&
        (c.name.toLowerCase().includes(q) || String(c.address).toLowerCase().includes(q)),
    );
  }, [candidates, search, currentControllerAddress]);

  const wallets = filtered.filter((c): c is WalletCandidate => c.source === 'wallet');
  const contacts = filtered.filter((c): c is ContactCandidate => c.source === 'contact');

  return (
    <div className="space-y-3">
      {/* Modify-current section */}
      <div>
        <FootnoteText className="mb-2 font-semibold tracking-wide text-text-tertiary uppercase">
          {t('flexibleMultisig.editController.picker.modifySection')}
        </FootnoteText>
        <button
          aria-expanded={modifyExpanded}
          className={cnTw(
            'flex w-full items-center rounded-lg p-3 text-left transition-colors',
            target?.kind === 'modify'
              ? 'border border-transparent bg-block-background-default ring-2 ring-icon-accent ring-inset'
              : 'border border-container-border bg-block-background-default hover:bg-action-background-hover',
          )}
          type="button"
          onClick={() => setModifyExpanded((v) => !v)}
        >
          <FootnoteText className="font-semibold text-text-primary">
            {t('flexibleMultisig.editController.picker.modifyTitle')}
          </FootnoteText>
        </button>
        {modifyExpanded && (
          <div className="mt-2">
            <ModifyCurrentForm
              chain={chain}
              initialSignatories={currentSignatories}
              initialThreshold={currentThreshold}
              onChange={(modifyTarget) => {
                if (modifyTarget) targetSelected(modifyTarget);
              }}
            />
          </div>
        )}
      </div>

      <SearchInput
        placeholder={t('flexibleMultisig.editController.picker.search')}
        value={search}
        onChange={setSearch}
      />

      <Section
        items={wallets}
        target={target}
        title={t('flexibleMultisig.editController.picker.myWallets')}
        onSelect={(c) => targetSelected({ kind: 'existing', candidate: c })}
      />
      <Section
        items={contacts}
        target={target}
        title={t('flexibleMultisig.editController.picker.fromAddressBook')}
        onSelect={(c) => targetSelected({ kind: 'existing', candidate: c })}
      />
    </div>
  );
};

type SectionProps = {
  title: string;
  items: MultisigCandidate[];
  target: SelectedTarget | null;
  onSelect: (c: MultisigCandidate) => void;
};

const Section = ({ title, items, target, onSelect }: SectionProps) => {
  if (items.length === 0) return null;
  return (
    <div>
      <FootnoteText className="mb-2 font-semibold tracking-wide text-text-tertiary uppercase">{title}</FootnoteText>
      <div className="space-y-1">
        {items.map((c) => {
          const selected = target?.kind === 'existing' && target.candidate.address === c.address;
          return (
            <button
              key={c.address}
              aria-pressed={selected}
              className={cnTw(
                'flex w-full items-center gap-2 rounded-lg p-3 text-left transition-colors',
                selected
                  ? 'border border-transparent bg-block-background-default ring-2 ring-icon-accent ring-inset'
                  : 'border border-container-border bg-block-background-default hover:bg-action-background-hover',
              )}
              type="button"
              onClick={() => onSelect(c)}
            >
              <Identicon address={c.address} background={false} size={24} />
              <div className="min-w-0 flex-1">
                <FootnoteText className="truncate font-medium text-text-primary">{c.name}</FootnoteText>
                <HelpText className="text-text-tertiary">
                  {c.threshold}/{c.signatories.length}
                  {' · '}
                  {String(c.address).slice(0, 6)}
                  {'…'}
                  {String(c.address).slice(-4)}
                </HelpText>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
