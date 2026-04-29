import { useUnit } from 'effector-react';
import { useCallback, useMemo, useState } from 'react';

import { type Address, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { performSearch, toAddress, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, HelpText } from '@/shared/ui';
import { AccountExplorers, Address as AddressDisplay, Identicon } from '@/shared/ui-entities';
import { Field, Select, Tabs } from '@/shared/ui-kit';
import { accountService, accounts as accountsStore, identity, useAccountName } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { networkModel } from '@/entities/network';
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
  currentThreshold: number;
};

type Mode = 'modify' | 'replace';

export const UnifiedPicker = ({ chain, currentControllerAddress, currentThreshold }: Props) => {
  const { t } = useI18n();
  const candidates = useUnit(multisigCandidates.$candidates);
  const allAccounts = useUnit(accountsStore.$list);
  const allContacts = useUnit(contactModel.$contacts);
  const allIdentities = useUnit(identity.$list);
  const allChains = useUnit(networkModel.$chains);
  const [target, targetSelected] = useUnit([
    changeSignatoriesModel.$selectedTarget,
    changeSignatoriesModel.targetSelected,
  ]);
  const [mode, setMode] = useState<Mode>('modify');
  const [query, setQuery] = useState('');

  // Use the canonical resolver (custom wallet name → local contact → backend contact
  // → identity → short address) so the picker matches wallet-details. resolveAccountName
  // falls back to a 5-char truncated address when nothing matches; in that case we
  // prefer the candidate's own name (wallet.name or backend contact name from
  // merge-candidates) since it's friendlier than `1UTUu...6tZDp`.
  const shortAddressFor = useCallback(
    (accountId: AccountId) => toShortAddress(toAddress(accountId, { prefix: chain.addressPrefix }), 5),
    [chain.addressPrefix],
  );

  const selectableCandidates = useMemo(
    () =>
      candidates
        .filter((c) => c.address !== currentControllerAddress)
        .map((c) => {
          const resolved = accountService.resolveAccountName({
            accountId: c.accountId,
            chain,
            accounts: allAccounts,
            contacts: allContacts,
            identities: allIdentities,
            chains: allChains,
          });
          return { ...c, name: resolved === shortAddressFor(c.accountId) ? c.name : resolved };
        }),
    [candidates, currentControllerAddress, chain, allAccounts, allContacts, allIdentities, allChains, shortAddressFor],
  );

  const filtered = useMemo(
    () =>
      performSearch({
        query,
        records: selectableCandidates,
        weights: { name: 1, address: 0.5 },
      }),
    [selectableCandidates, query],
  );

  const wallets = filtered.filter((c): c is WalletCandidate => c.source === 'wallet');
  const contacts = filtered.filter((c): c is ContactCandidate => c.source === 'contact');

  const onSelect = (value: string) => {
    const candidate = selectableCandidates.find((c) => c.address === value);
    if (candidate) targetSelected({ kind: 'existing', candidate });
  };

  // Stable identity so the form's propagation effect doesn't fire on every parent
  // re-render (otherwise targetSelected → re-render → new callback → loop).
  const handleModifyChange = useCallback(
    (modifyTarget: SelectedTarget | null) => {
      targetSelected(modifyTarget);
    },
    [targetSelected],
  );

  const selectedCandidate = target?.kind === 'existing' ? target.candidate : null;

  return (
    <Tabs value={mode} onChange={setMode}>
      <Tabs.List>
        <Tabs.Trigger value="modify">{t('flexibleMultisig.editController.picker.tabs.modify')}</Tabs.Trigger>
        <Tabs.Trigger value="replace">{t('flexibleMultisig.editController.picker.tabs.replace')}</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="modify">
        <ModifyCurrentForm
          active={mode === 'modify'}
          chain={chain}
          currentControllerAddress={currentControllerAddress}
          initialThreshold={currentThreshold}
          onChange={handleModifyChange}
        />
      </Tabs.Content>

      <Tabs.Content value="replace">
        <div className="flex flex-col gap-4">
          <Field text={t('flexibleMultisig.editController.picker.search')}>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <Select
                  placeholder={t('flexibleMultisig.editController.picker.searchPlaceholder')}
                  value={selectedCandidate?.address ?? null}
                  valueNode={selectedCandidate ? <CandidateRow candidate={selectedCandidate} /> : null}
                  height="md"
                  onChange={onSelect}
                  onSearch={setQuery}
                >
                  {wallets.length > 0 && (
                    <Select.Group title={t('flexibleMultisig.editController.picker.myWallets')}>
                      {wallets.map((c) => (
                        <Select.Item key={c.address} value={c.address}>
                          <CandidateRow candidate={c} />
                        </Select.Item>
                      ))}
                    </Select.Group>
                  )}
                  {contacts.length > 0 && (
                    <Select.Group title={t('flexibleMultisig.editController.picker.fromAddressBook')}>
                      {contacts.map((c) => (
                        <Select.Item key={c.address} value={c.address}>
                          <CandidateRow candidate={c} />
                        </Select.Item>
                      ))}
                    </Select.Group>
                  )}
                </Select>
              </div>
              {selectedCandidate ? <AccountExplorers accountId={selectedCandidate.address} chain={chain} /> : null}
            </div>
          </Field>

          {selectedCandidate ? <CandidateDetails chain={chain} candidate={selectedCandidate} /> : null}
        </div>
      </Tabs.Content>
    </Tabs>
  );
};

const CandidateRow = ({ candidate }: { candidate: MultisigCandidate }) => (
  <div className="flex min-w-0 flex-1 items-center gap-2">
    <div className="min-w-0 flex-1">
      <AddressDisplay showIcon iconSize={20} title={candidate.name} address={candidate.address} variant="truncate" />
    </div>
    <HelpText className="shrink-0 text-text-tertiary">
      {candidate.threshold}/{candidate.signatories.length}
    </HelpText>
  </div>
);

type CandidateDetailsProps = {
  candidate: MultisigCandidate;
  chain: Chain;
};

const CandidateDetails = ({ candidate, chain }: CandidateDetailsProps) => {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-container-border bg-block-background-default/60 p-3">
      <div className="flex flex-col gap-2">
        <FootnoteText className="text-text-tertiary">
          {t('flexibleMultisig.editController.modifyCurrent.signatoriesLabel')}
        </FootnoteText>
        <ul className="flex flex-col gap-y-1.5">
          {candidate.signatories.map((accountId) => (
            <li key={accountId}>
              <SignatoryReadOnlyRow accountId={accountId} chain={chain} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const SignatoryReadOnlyRow = ({ accountId, chain }: { accountId: AccountId; chain: Chain }) => {
  const address = toAddress(accountId, { prefix: chain.addressPrefix });
  const name = useAccountName({ accountId, chain });
  return (
    <div className="flex items-center gap-2">
      <Identicon canCopy address={address} size={20} background={false} />
      <div className="min-w-0 flex-1">
        <AddressDisplay title={name} address={address} variant="truncate" />
      </div>
      <AccountExplorers accountId={accountId} chain={chain} />
    </div>
  );
};
