import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { MultiSelect } from '@/shared/ui';
import { contactModel } from '@/entities/contact';
import { type AccountSource, type FieldCriterion, type PresetFilterCriteria } from '@/aggregates/account-presets';

type Props = {
  filters: PresetFilterCriteria;
  onFiltersChange: (filters: PresetFilterCriteria) => void;
};

type SourceOption = {
  id: AccountSource;
  label: string;
};

const SOURCE_OPTIONS: SourceOption[] = [
  { id: 'wallet', label: 'dashboard.presets.sources.wallet' },
  { id: 'local-contact', label: 'dashboard.presets.sources.localContact' },
  { id: 'backend-contact', label: 'dashboard.presets.sources.backendContact' },
];

type FieldGroup = {
  fieldId: string;
  fieldName: string;
  options: { id: string; value: string }[];
};

export const PresetFilterEditor = ({ filters, onFiltersChange }: Props) => {
  const { t } = useI18n();
  const backendContacts = useUnit(contactModel.$backendContacts);

  // Filter groups are derived from the synced contacts, so admin-defined fields
  // appear here as soon as some contact carries them and disappear when none does.
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

    const fieldGroups: FieldGroup[] = Array.from(groups.entries())
      .map(([fieldId, group]) => ({
        fieldId,
        fieldName: group.fieldName,
        options: Array.from(group.options.entries())
          .map(([id, value]) => ({ id, value }))
          .sort((a, b) => a.value.localeCompare(b.value)),
      }))
      .sort((a, b) => a.fieldName.localeCompare(b.fieldName));

    return {
      chainOptions: Array.from(chainNamesById.entries()).map(([chainId, chainName]) => ({
        id: chainId,
        value: chainId,
        element: chainName,
      })),
      fieldGroups,
    };
  }, [backendContacts]);

  // Saved criteria over fields that no longer exist in the address book — shown
  // from their snapshots so the preset's constraints stay visible and clearable.
  const staleCriteria = useMemo(
    () => filters.fields.filter((criterion) => !fieldGroups.some((group) => group.fieldId === criterion.fieldId)),
    [filters.fields, fieldGroups],
  );

  const toggleSource = (sourceId: AccountSource) => {
    const already = filters.sources.includes(sourceId);
    const newSources = already ? filters.sources.filter((s) => s !== sourceId) : [...filters.sources, sourceId];
    onFiltersChange({ ...filters, sources: newSources });
  };

  const handleChainChange = (results: { id: string; value: string }[]) => {
    onFiltersChange({ ...filters, chainIds: results.map((r) => r.id) });
  };

  const handleFieldChange = (group: FieldGroup, results: { id: string; value: string }[]) => {
    const nextFields = filters.fields.filter((criterion) => criterion.fieldId !== group.fieldId);
    if (results.length > 0) {
      nextFields.push({
        fieldId: group.fieldId,
        fieldName: group.fieldName,
        options: results.map((r) => ({ id: r.id, value: r.value })),
      });
    }
    onFiltersChange({ ...filters, fields: nextFields });
  };

  // Selected options that were deleted on the backend stay listed via their
  // snapshot labels, otherwise they would be invisible and impossible to unpick.
  const withSelectedSnapshots = (group: FieldGroup, criterion: FieldCriterion | undefined) => {
    const byId = new Map(group.options.map((option) => [option.id, option.value]));
    for (const option of criterion?.options ?? []) {
      if (!byId.has(option.id)) byId.set(option.id, option.value);
    }

    return Array.from(byId.entries()).map(([id, value]) => ({ id, value, element: value }));
  };

  const renderFieldGroup = (group: FieldGroup, isStale: boolean) => {
    const criterion = filters.fields.find((c) => c.fieldId === group.fieldId);

    return (
      <MultiSelect
        key={group.fieldId}
        label={isStale ? `${group.fieldName} (${t('dashboard.presets.modal.removedField')})` : group.fieldName}
        placeholder={t('dashboard.presets.modal.anyValue')}
        options={withSelectedSnapshots(group, criterion)}
        selectedIds={criterion?.options.map((option) => option.id) ?? []}
        onChange={(results) => handleFieldChange(group, results)}
      />
    );
  };

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex flex-col gap-y-1">
        <span className="text-footnote text-text-tertiary">{t('dashboard.presets.modal.sourceType')}</span>
        <div className="flex flex-wrap gap-2">
          {SOURCE_OPTIONS.map((opt) => {
            const active = filters.sources.includes(opt.id);

            return (
              <button
                key={opt.id}
                type="button"
                className={cnTw(
                  'rounded-full px-3 py-1 text-footnote transition-colors',
                  active
                    ? 'bg-icon-accent text-white'
                    : 'border border-filter-border text-text-secondary hover:bg-action-background-hover',
                )}
                onClick={() => toggleSource(opt.id)}
              >
                {t(opt.label)}
              </button>
            );
          })}
        </div>
      </div>

      {chainOptions.length > 0 && (
        <MultiSelect
          label={t('dashboard.presets.modal.network')}
          placeholder={t('dashboard.presets.modal.anyNetwork')}
          options={chainOptions}
          selectedIds={filters.chainIds}
          onChange={handleChainChange}
        />
      )}

      {fieldGroups.map((group) => renderFieldGroup(group, false))}

      {staleCriteria.map((criterion) =>
        renderFieldGroup({ fieldId: criterion.fieldId, fieldName: criterion.fieldName, options: [] }, true),
      )}
    </div>
  );
};
