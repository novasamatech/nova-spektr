import { type Store } from 'effector';
import { useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Counter, FootnoteText, Icon } from '@/shared/ui';
import { Popover } from '@/shared/ui-kit';
import { contactModel } from '@/entities/contact';
import {
  type AccountSource,
  type FieldCriterion,
  type PresetFilterCriteria,
  EMPTY_FILTERS,
} from '@/aggregates/account-presets';

type Props = {
  $filters: Store<PresetFilterCriteria>;
  onChange: (filters: PresetFilterCriteria) => void;
};

const SOURCE_OPTIONS: { id: AccountSource; labelKey: string }[] = [
  { id: 'wallet', labelKey: 'dashboard.presets.sources.wallet' },
  { id: 'local-contact', labelKey: 'dashboard.presets.sources.localContact' },
  { id: 'backend-contact', labelKey: 'dashboard.presets.sources.backendContact' },
];

const countActive = (filters: PresetFilterCriteria): number =>
  filters.sources.length +
  filters.chainIds.length +
  filters.fields.reduce((total, criterion) => total + criterion.options.length, 0);

/**
 * Ad-hoc narrowing on top of the active preset, applied from the selector
 * itself.
 *
 * The management modal is where a scope becomes a **decision** — named, saved,
 * shared between surfaces. This is where the user takes a look: filter by a
 * network or an address-book field for as long as they are looking at it, then
 * drop it. It is intentionally not persisted, so nothing survives a restart to
 * silently scope the dashboard to something nobody remembers choosing.
 *
 * The groups are derived from the synced contacts exactly as the management
 * modal's editor derives them — offering a network or a field option that no
 * contact carries would be a chip that can only ever empty the list.
 */
export const QuickFilterPopover = ({ $filters, onChange }: Props) => {
  const { t } = useI18n();
  const filters = useUnit($filters);
  const backendContacts = useUnit(contactModel.$backendContacts);
  const [open, setOpen] = useState(false);

  const { chainOptions, fieldGroups } = useMemo(() => {
    const chainNamesById = new Map<string, string>();
    const groups = new Map<string, { fieldName: string; options: Map<string, string> }>();

    for (const contact of backendContacts) {
      if (contact.chainId) {
        chainNamesById.set(contact.chainId, contact.chainName ?? contact.chainId);
      }
      for (const field of contact.fields) {
        let group = groups.get(field.fieldId);
        if (!group) {
          group = { fieldName: field.fieldName, options: new Map() };
          groups.set(field.fieldId, group);
        }
        for (const optionValue of field.values) {
          group.options.set(optionValue.optionId, optionValue.value);
        }
      }
    }

    return {
      chainOptions: Array.from(chainNamesById.entries())
        .map(([chainId, chainName]) => ({ id: chainId, label: chainName }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      fieldGroups: Array.from(groups.entries())
        .map(([fieldId, group]) => ({
          fieldId,
          fieldName: group.fieldName,
          options: Array.from(group.options.entries())
            .map(([id, value]) => ({ id, value }))
            .sort((a, b) => a.value.localeCompare(b.value)),
        }))
        .sort((a, b) => a.fieldName.localeCompare(b.fieldName)),
    };
  }, [backendContacts]);

  const active = countActive(filters);

  /** Criteria that only address-book contacts carry values for. */
  const addressBookScoped = filters.chainIds.length > 0 || filters.fields.length > 0;

  const toggleChain = (chainId: string) => {
    const next = filters.chainIds.includes(chainId)
      ? filters.chainIds.filter((id) => id !== chainId)
      : [...filters.chainIds, chainId];

    onChange({ ...filters, chainIds: next });
  };

  const toggleSource = (source: AccountSource) => {
    const next = filters.sources.includes(source)
      ? filters.sources.filter((s) => s !== source)
      : [...filters.sources, source];

    onChange({ ...filters, sources: next });
  };

  /**
   * A criterion is stored per field, so toggling the last option of a field
   * drops the whole criterion rather than leaving an empty one behind — an
   * empty option list constrains nothing, and keeping it would make the badge
   * count a filter the user has just cleared.
   */
  const toggleFieldOption = (group: { fieldId: string; fieldName: string }, option: { id: string; value: string }) => {
    const criterion = filters.fields.find((c) => c.fieldId === group.fieldId);
    const selected = criterion?.options ?? [];
    const nextOptions = selected.some((o) => o.id === option.id)
      ? selected.filter((o) => o.id !== option.id)
      : [...selected, option];

    const others = filters.fields.filter((c) => c.fieldId !== group.fieldId);
    const nextFields: FieldCriterion[] =
      nextOptions.length === 0
        ? others
        : [...others, { fieldId: group.fieldId, fieldName: group.fieldName, options: nextOptions }];

    onChange({ ...filters, fields: nextFields });
  };

  const isFieldOptionActive = (fieldId: string, optionId: string) =>
    filters.fields.some((c) => c.fieldId === fieldId && c.options.some((o) => o.id === optionId));

  return (
    <Popover open={open} align="end" side="bottom" onToggle={setOpen}>
      <Popover.Trigger>
        <button
          type="button"
          aria-label={t('presets.quickFilter.title')}
          className={cnTw(
            'flex items-center gap-x-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-action-background-hover',
            active > 0 ? 'text-icon-accent' : 'text-icon-default',
          )}
        >
          <Icon name="settingsLite" size={14} className="text-inherit" />
          {active > 0 ? <Counter variant="waiting">{active}</Counter> : null}
        </button>
      </Popover.Trigger>

      <Popover.Content>
        <div className="flex max-h-[420px] w-[260px] flex-col gap-y-3 overflow-y-auto p-3">
          <ChipGroup
            title={t('presets.quickFilter.network')}
            options={chainOptions}
            isActive={(id) => filters.chainIds.includes(id)}
            onToggle={toggleChain}
          />

          <ChipGroup
            title={t('presets.quickFilter.source')}
            options={SOURCE_OPTIONS.map((option) => ({ id: option.id, label: t(option.labelKey) }))}
            isActive={(id) => filters.sources.includes(id)}
            onToggle={toggleSource}
          />

          {fieldGroups.map((group) => (
            <ChipGroup
              key={group.fieldId}
              title={group.fieldName}
              options={group.options.map((option) => ({ id: option.id, label: option.value }))}
              isActive={(id) => isFieldOptionActive(group.fieldId, id)}
              onToggle={(id) => {
                const option = group.options.find((o) => o.id === id);
                if (option) toggleFieldOption(group, option);
              }}
            />
          ))}

          {addressBookScoped && (
            /* `applyPresetFilter` answers network and field criteria from
               address-book metadata, so a row without it cannot match one.
               Saying so beats letting the user combine `Source: Wallet` with a
               network chip and read the empty result as a bug. */
            <FootnoteText className="text-text-tertiary">{t('presets.quickFilter.addressBookOnly')}</FootnoteText>
          )}

          {active > 0 && (
            <button
              type="button"
              className="self-start rounded px-1 py-0.5 transition-colors hover:bg-action-background-hover"
              onClick={() => onChange(EMPTY_FILTERS)}
            >
              <FootnoteText className="text-text-tertiary">{t('presets.quickFilter.clear')}</FootnoteText>
            </button>
          )}
        </div>
      </Popover.Content>
    </Popover>
  );
};

type ChipGroupProps<T extends string> = {
  title: string;
  options: { id: T; label: string }[];
  isActive: (id: T) => boolean;
  onToggle: (id: T) => void;
};

const ChipGroup = <T extends string>({ title, options, isActive, onToggle }: ChipGroupProps<T>) => {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-col gap-y-1.5">
      <FootnoteText className="text-text-tertiary">{title}</FootnoteText>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={cnTw(
              'max-w-full truncate rounded-full px-2.5 py-1 text-footnote transition-colors',
              isActive(option.id)
                ? 'bg-icon-accent text-white'
                : 'border border-filter-border text-text-secondary hover:bg-action-background-hover',
            )}
            onClick={() => onToggle(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};
