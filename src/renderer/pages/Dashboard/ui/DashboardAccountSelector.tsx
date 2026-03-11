import { useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { CaptionText, FootnoteText, Icon } from '@/shared/ui';
import { Identicon, WalletAccountIcon } from '@/shared/ui-entities';
import { Checkbox, Popover } from '@/shared/ui-kit';
import { type DashboardEntry, dashboardModel } from '../model/dashboard-model';

export const DashboardAccountSelector = () => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const allEntries = useUnit(dashboardModel.$allEntries);
  const selectedIds = useUnit(dashboardModel.$selectedIds);

  const accountIdToEntryIds = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const entry of allEntries) {
      const group = map.get(entry.accountId) ?? [];
      group.push(entry.id);
      map.set(entry.accountId, group);
    }

    return map;
  }, [allEntries]);

  const linkedIdsFor = (entries: DashboardEntry[]): Set<string> => {
    const ids = new Set<string>();
    for (const entry of entries) {
      for (const id of accountIdToEntryIds.get(entry.accountId) ?? []) {
        ids.add(id);
      }
    }

    return ids;
  };

  const selectedSet = new Set(selectedIds);
  const selectedCount = allEntries.filter((e) => selectedSet.has(e.id)).length;

  const areAllSelected = allEntries.length > 0 && selectedCount === allEntries.length;
  const areSomeSelected = selectedCount > 0;

  const walletEntries = allEntries.filter((e) => e.source === 'wallet');
  const contactEntries = allEntries.filter((e) => e.source === 'contact');

  const toggleAll = (checked: boolean) => {
    if (checked) {
      dashboardModel.selectAll();
    } else {
      dashboardModel.deselectAll();
    }
  };

  const toggleEntry = (entry: DashboardEntry) => {
    const linked = linkedIdsFor([entry]);
    if (selectedSet.has(entry.id)) {
      dashboardModel.selectionChanged(selectedIds.filter((id) => !linked.has(id)));
    } else {
      const toAdd = Array.from(linked).filter((id) => !selectedSet.has(id));
      dashboardModel.selectionChanged([...selectedIds, ...toAdd]);
    }
  };

  const toggleContacts = (checked: boolean) => {
    const linked = linkedIdsFor(contactEntries);
    if (checked) {
      const toAdd = Array.from(linked).filter((id) => !selectedSet.has(id));
      dashboardModel.selectionChanged([...selectedIds, ...toAdd]);
    } else {
      dashboardModel.selectionChanged(selectedIds.filter((id) => !linked.has(id)));
    }
  };

  const allContactsSelected = contactEntries.length > 0 && contactEntries.every((e) => selectedSet.has(e.id));
  const someContactsSelected = contactEntries.some((e) => selectedSet.has(e.id));

  return (
    <Popover align="start" open={open} side="bottom" onToggle={setOpen}>
      <Popover.Trigger>
        <button className="inline-flex w-[250px] items-center justify-between gap-2 rounded-sm border border-filter-border bg-input-background px-2 py-2 text-footnote text-text-primary hover:bg-action-background-hover">
          <TriggerLabel selectedCount={selectedCount} />
          <Icon name={open ? 'up' : 'down'} size={16} className="shrink-0" />
        </button>
      </Popover.Trigger>

      <Popover.Content>
        <div className="w-[400px] rounded-md border border-token-container-border bg-white p-1 shadow-card-shadow">
          <div className="rounded-sm p-2 hover:bg-action-background-hover">
            <Checkbox checked={areAllSelected} semiChecked={areSomeSelected} onChange={toggleAll}>
              <FootnoteText className={areSomeSelected ? 'text-text-primary' : 'text-text-secondary'}>
                {t('dashboard.accountSelector.allAccounts')}
              </FootnoteText>
            </Checkbox>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {walletEntries.map((entry) => (
              <WalletRow key={entry.id} entry={entry} selected={selectedSet.has(entry.id)} onToggle={toggleEntry} />
            ))}

            {contactEntries.length > 0 && (
              <>
                <div className="my-1 border-t border-divider" />
                <div className="rounded-sm p-2 hover:bg-action-background-hover">
                  <Checkbox checked={allContactsSelected} semiChecked={someContactsSelected} onChange={toggleContacts}>
                    <div className="flex h-5 w-7.5 items-center justify-center rounded-2lg bg-input-background-disabled">
                      <CaptionText className="text-text-secondary">{contactEntries.length}</CaptionText>
                    </div>
                    <FootnoteText className={someContactsSelected ? 'text-text-primary' : 'text-text-secondary'}>
                      {t('dashboard.accountSelector.contactsGroup')}
                    </FootnoteText>
                  </Checkbox>
                </div>
                {contactEntries.map((entry) => (
                  <ContactRow
                    key={entry.id}
                    entry={entry}
                    selected={selectedSet.has(entry.id)}
                    onToggle={toggleEntry}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </Popover.Content>
    </Popover>
  );
};

const TriggerLabel = ({ selectedCount }: { selectedCount: number }) => {
  const { t } = useI18n();

  if (selectedCount === 0) {
    return (
      <FootnoteText as="span" className="text-text-secondary">
        {t('dashboard.accountSelector.placeholder')}
      </FootnoteText>
    );
  }

  return (
    <span className="flex items-center gap-x-2">
      <FootnoteText as="span">{t('dashboard.accountSelector.placeholder')}</FootnoteText>
      <CaptionText as="span" className="h-4 rounded-[30px] bg-icon-accent px-1.5 leading-4 text-white" align="center">
        {selectedCount}
      </CaptionText>
    </span>
  );
};

type RowProps = {
  entry: DashboardEntry;
  selected: boolean;
  onToggle: (entry: DashboardEntry) => void;
};

const WalletRow = ({ entry, selected, onToggle }: RowProps) => (
  <div className="rounded-sm p-2 pl-6 hover:bg-action-background-hover">
    <Checkbox checked={selected} onChange={() => onToggle(entry)}>
      <div className="flex items-center gap-x-2">
        {entry.walletType ? (
          <WalletAccountIcon address={toAddress(entry.address)} type={entry.walletType} size={24} iconSize={12} />
        ) : (
          <Identicon address={toAddress(entry.address)} size={24} />
        )}
        <FootnoteText className="truncate">{entry.name}</FootnoteText>
        <CaptionText className="shrink-0 text-text-tertiary">{toShortAddress(entry.accountId, 4)}</CaptionText>
      </div>
    </Checkbox>
  </div>
);

const ContactRow = ({ entry, selected, onToggle }: RowProps) => (
  <div className="rounded-sm p-2 pl-6 hover:bg-action-background-hover">
    <Checkbox checked={selected} onChange={() => onToggle(entry)}>
      <div className="flex items-center gap-x-2">
        <Identicon address={toAddress(entry.address)} size={24} />
        <FootnoteText className="truncate">{entry.name}</FootnoteText>
        <CaptionText className="shrink-0 text-text-tertiary">{toShortAddress(entry.accountId, 4)}</CaptionText>
      </div>
    </Checkbox>
  </div>
);
