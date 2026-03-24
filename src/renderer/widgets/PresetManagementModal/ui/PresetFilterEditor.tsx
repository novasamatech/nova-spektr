import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { MultiSelect } from '@/shared/ui';
import { Input } from '@/shared/ui-kit';
import { contactModel } from '@/entities/contact';
import { type PresetFilterCriteria } from '@/aggregates/dashboard-presets';

type Props = {
  name: string;
  filters: PresetFilterCriteria;
  onNameChange: (name: string) => void;
  onFiltersChange: (filters: PresetFilterCriteria) => void;
};

type SourceOption = {
  id: 'wallet' | 'local-contact' | 'backend-contact';
  label: string;
};

const SOURCE_OPTIONS: SourceOption[] = [
  { id: 'wallet', label: 'dashboard.presets.sources.wallet' },
  { id: 'local-contact', label: 'dashboard.presets.sources.localContact' },
  { id: 'backend-contact', label: 'dashboard.presets.sources.backendContact' },
];

export const PresetFilterEditor = ({ name, filters, onNameChange, onFiltersChange }: Props) => {
  const { t } = useI18n();
  const backendContacts = useUnit(contactModel.$backendContacts);

  const { entityNameOptions, categoryOptions, tagOptions } = useMemo(() => {
    const entityNamesSet = new Set<string>();
    const categoriesSet = new Set<string>();
    const tagsMap = new Map<string, Set<string>>();

    for (const contact of backendContacts) {
      for (const en of contact.entityNames) {
        entityNamesSet.add(en);
      }
      if (contact.categoryName) {
        categoriesSet.add(contact.categoryName);
      }
      for (const tag of contact.tags) {
        if (!tagsMap.has(tag.tagName)) {
          tagsMap.set(tag.tagName, new Set());
        }
        for (const v of tag.values) {
          tagsMap.get(tag.tagName)!.add(v);
        }
      }
    }

    return {
      entityNameOptions: Array.from(entityNamesSet).map((en) => ({ id: en, value: en, element: en })),
      categoryOptions: Array.from(categoriesSet).map((c) => ({ id: c, value: c, element: c })),
      tagOptions: Array.from(tagsMap.entries()).map(([tagName, valuesSet]) => ({
        tagName,
        options: Array.from(valuesSet).map((v) => ({ id: v, value: v, element: v })),
      })),
    };
  }, [backendContacts]);

  const toggleSource = (sourceId: 'wallet' | 'local-contact' | 'backend-contact') => {
    const already = filters.sources.includes(sourceId);
    const newSources = already ? filters.sources.filter((s) => s !== sourceId) : [...filters.sources, sourceId];
    onFiltersChange({ ...filters, sources: newSources });
  };

  const handleEntityChange = (results: { id: string; value: string }[]) => {
    onFiltersChange({ ...filters, entityNames: results.map((r) => r.id) });
  };

  const handleCategoryChange = (results: { id: string; value: string }[]) => {
    onFiltersChange({ ...filters, categoryNames: results.map((r) => r.id) });
  };

  const handleTagChange = (tagName: string, results: { id: string; value: string }[]) => {
    const newTags = filters.tags.filter((t) => t.tagName !== tagName);
    if (results.length > 0) {
      newTags.push({ tagName, values: results.map((r) => r.id) });
    }
    onFiltersChange({ ...filters, tags: newTags });
  };

  return (
    <div className="flex flex-col gap-y-3">
      {/* Name */}
      <div className="flex flex-col gap-y-1">
        <label className="text-footnote text-text-tertiary">{t('dashboard.presets.modal.name')}</label>
        <Input
          value={name}
          placeholder={t('dashboard.presets.modal.namePlaceholder')}
          maxLength={30}
          width="full"
          onChange={onNameChange}
        />
      </div>

      {/* Source Type */}
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

      {/* Entity */}
      {entityNameOptions.length > 0 && (
        <MultiSelect
          label={t('dashboard.presets.modal.entity')}
          placeholder={t('dashboard.presets.modal.entity')}
          options={entityNameOptions}
          selectedIds={filters.entityNames}
          onChange={handleEntityChange}
        />
      )}

      {/* Category */}
      {categoryOptions.length > 0 && (
        <MultiSelect
          label={t('dashboard.presets.modal.category')}
          placeholder={t('dashboard.presets.modal.anyCategory')}
          options={categoryOptions}
          selectedIds={filters.categoryNames}
          onChange={handleCategoryChange}
        />
      )}

      {/* Tags */}
      {tagOptions.map(({ tagName, options }) => {
        const tagFilter = filters.tags.find((t) => t.tagName === tagName);

        return (
          <MultiSelect
            key={tagName}
            label={tagName}
            placeholder={t('dashboard.presets.modal.anyTags')}
            options={options}
            selectedIds={tagFilter?.values ?? []}
            onChange={(results) => handleTagChange(tagName, results)}
          />
        );
      })}
    </div>
  );
};
