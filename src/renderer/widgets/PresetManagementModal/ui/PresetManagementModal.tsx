import { move } from '@dnd-kit/helpers';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { useUnit } from 'effector-react';
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon } from '@/shared/ui';
import { ConfirmModal, Input, Modal, useNotification } from '@/shared/ui-kit';
import {
  type PresetFilterCriteria,
  type PresetType,
  EMPTY_FILTERS,
  accountPresetsModel,
  applyPresetFilter,
  normalizePresetFilters,
} from '@/aggregates/account-presets';

import { CustomAccountSelector } from './CustomAccountSelector';
import { MatchedAccountsPreview } from './MatchedAccountsPreview';
import { PresetFilterEditor } from './PresetFilterEditor';
import { SourceBreakdownBar } from './SourceBreakdownBar';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const PresetManagementModal = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();
  const { toast } = useNotification();

  const presets = useUnit(accountPresetsModel.$presets);
  const allEntries = useUnit(accountPresetsModel.$allEntries);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<PresetType>('filter');
  const [editFilters, setEditFilters] = useState<PresetFilterCriteria>(EMPTY_FILTERS);
  const [editSelectedIds, setEditSelectedIds] = useState<string[]>([]);
  const [pendingSelectNew, setPendingSelectNew] = useState(false);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  const [dragIds, setDragIds] = useState<string[] | null>(null);
  const dragIdsRef = useRef<string[] | null>(null);
  dragIdsRef.current = dragIds;

  const presetIds = useMemo(() => presets.map((p) => p.id), [presets]);
  const presetsById = useMemo(() => new Map(presets.map((p) => [p.id, p])), [presets]);
  const displayIds = dragIds ?? presetIds;

  const selectPreset = useCallback(
    (id: string) => {
      const preset = presets.find((p) => p.id === id);
      if (!preset) return;
      setSelectedId(id);
      setEditName(preset.name);
      setEditType(preset.type ?? 'filter');
      setEditFilters(normalizePresetFilters(preset.filters));
      setEditSelectedIds(preset.selectedIds ?? []);
    },
    [presets],
  );

  const resetEditor = useCallback(() => {
    setSelectedId(null);
    setEditName('');
    setEditType('custom');
    setEditFilters(EMPTY_FILTERS);
    setEditSelectedIds([]);
  }, []);

  useEffect(() => {
    if (isOpen && presets.length > 0 && selectedId === null) {
      const first = presets[0];
      if (first) selectPreset(first.id);
    }
    if (!isOpen) {
      setSelectedId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!pendingSelectNew) return;

    const newest = presets[presets.length - 1];
    if (newest) selectPreset(newest.id);
    setPendingSelectNew(false);
  }, [pendingSelectNew]);

  // DnD handlers
  const handleDragStart = useCallback(() => {
    setDragIds(presetIds);
  }, [presetIds]);

  const handleDragOver: ComponentProps<typeof DragDropProvider>['onDragOver'] = useCallback(
    (event: Parameters<NonNullable<ComponentProps<typeof DragDropProvider>['onDragOver']>>[0]) => {
      setDragIds((prev) => {
        if (!prev) return prev;
        const next = move(prev, event);
        return next.join(',') === prev.join(',') ? prev : next;
      });
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    if (dragIdsRef.current) {
      accountPresetsModel.presetsReordered(dragIdsRef.current);
    }
    setDragIds(null);
  }, []);

  const handleSave = () => {
    const trimmedName = editName.trim();
    if (!trimmedName) return;

    const payload = {
      name: trimmedName,
      type: editType,
      filters: editType === 'filter' ? editFilters : EMPTY_FILTERS,
      selectedIds: editType === 'custom' ? editSelectedIds : [],
    };

    if (selectedId === null) {
      accountPresetsModel.presetCreated(payload);
      setPendingSelectNew(true);
      toast.success(t('dashboard.presets.modal.createdToast', { name: trimmedName }));
    } else {
      accountPresetsModel.presetUpdated({ id: selectedId, ...payload });
      toast.success(t('dashboard.presets.modal.savedToast', { name: trimmedName }));
    }
  };

  const handleDelete = () => {
    if (deleteCandidateId === null) return;

    const deletedPreset = presetsById.get(deleteCandidateId);
    if (!deletedPreset) return;

    const deletedIndex = presets.findIndex((p) => p.id === deleteCandidateId);
    accountPresetsModel.presetDeleted(deleteCandidateId);

    toast.success(t('dashboard.presets.modal.deletedToast', { name: deletedPreset.name }));

    // Move the editor off the deleted preset; an unrelated selection stays put.
    if (selectedId === deleteCandidateId) {
      const remaining = presets.filter((p) => p.id !== deleteCandidateId);
      if (remaining.length > 0) {
        const nextIndex = Math.min(deletedIndex, remaining.length - 1);
        const next = remaining[nextIndex];
        if (next) selectPreset(next.id);
      } else {
        resetEditor();
      }
    }
  };

  const isNewPreset = selectedId === null;
  const canSave = editName.trim().length > 0 && (editType === 'filter' || editSelectedIds.length > 0);

  const matchedEntries = useMemo(() => {
    if (editType === 'custom') {
      const selected = new Set(editSelectedIds);
      return allEntries.filter((e) => selected.has(e.id));
    }
    return applyPresetFilter(editFilters, allEntries);
  }, [editType, editSelectedIds, editFilters, allEntries]);

  return (
    <Modal isOpen={isOpen} size="lg" onToggle={(open) => !open && onClose()}>
      <Modal.Title close>{t('dashboard.presets.modal.title')}</Modal.Title>
      <Modal.Content disableScroll>
        <div className="flex h-full min-h-[400px]">
          <div className="flex w-[200px] shrink-0 flex-col border-r border-divider">
            <DragDropProvider onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
              <div className="flex-1 overflow-y-auto py-1">
                {displayIds.map((id, index) => {
                  const preset = presetsById.get(id);
                  if (!preset) return null;

                  return (
                    <SortablePresetItem
                      key={id}
                      id={id}
                      index={index}
                      name={preset.name}
                      isSelected={selectedId === id && !isNewPreset}
                      deleteLabel={t('dashboard.presets.modal.delete')}
                      onClick={() => selectPreset(id)}
                      onDelete={() => setDeleteCandidateId(id)}
                    />
                  );
                })}

                <button
                  type="button"
                  className={cnTw(
                    'flex w-full items-center gap-x-1.5 py-2.5 pl-7 text-footnote transition-all duration-150',
                    isNewPreset
                      ? 'bg-primary-button-background-default/8 font-semibold text-text-primary shadow-[inset_3px_0_0_0] shadow-icon-accent'
                      : 'text-icon-accent hover:bg-action-background-hover',
                  )}
                  onClick={resetEditor}
                >
                  <span className="text-base leading-none">+</span>
                  <FootnoteText as="span" className="text-inherit">
                    {t('dashboard.presets.modal.newPreset')}
                  </FootnoteText>
                </button>
              </div>
            </DragDropProvider>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-y-4 overflow-y-auto px-5 py-4">
            <div className="flex gap-x-2">
              <TypeChip
                active={editType === 'custom'}
                label={t('dashboard.presets.modal.typeCustom')}
                onClick={() => setEditType('custom')}
              />
              <TypeChip
                active={editType === 'filter'}
                label={t('dashboard.presets.modal.typeFilter')}
                onClick={() => setEditType('filter')}
              />
            </div>

            <div className="flex flex-col gap-y-1">
              <label className="text-footnote text-text-tertiary">{t('dashboard.presets.modal.name')}</label>
              <Input
                value={editName}
                placeholder={t('dashboard.presets.modal.namePlaceholder')}
                maxLength={30}
                width="full"
                onChange={setEditName}
              />
            </div>

            <SourceBreakdownBar entries={matchedEntries} total={allEntries.length} tone="light" />

            {editType === 'filter' ? (
              <>
                <PresetFilterEditor filters={editFilters} onFiltersChange={setEditFilters} />
                <MatchedAccountsPreview matched={matchedEntries} totalEntries={allEntries.length} />
              </>
            ) : (
              <CustomAccountSelector
                allEntries={allEntries}
                selectedIds={editSelectedIds}
                onSelectedIdsChange={setEditSelectedIds}
              />
            )}
          </div>
        </div>
      </Modal.Content>

      <Modal.Footer align="between">
        <div />
        <Button size="sm" variant="fill" pallet="primary" disabled={!canSave} onClick={handleSave}>
          {t('dashboard.presets.modal.save')}
        </Button>
      </Modal.Footer>

      <ConfirmModal
        title={t('dashboard.presets.modal.deleteConfirmTitle')}
        description={t('dashboard.presets.modal.deleteConfirmDescription', {
          name: deleteCandidateId !== null ? (presetsById.get(deleteCandidateId)?.name ?? '') : '',
        })}
        cancelText={t('dashboard.presets.modal.cancel')}
        confirmText={t('dashboard.presets.modal.deleteConfirmAction')}
        type="warning"
        isOpen={deleteCandidateId !== null}
        onToggle={(open) => {
          if (!open) setDeleteCandidateId(null);
        }}
        onConfirm={handleDelete}
      />
    </Modal>
  );
};

// --- Sortable preset item ---

type SortablePresetItemProps = {
  id: string;
  index: number;
  name: string;
  isSelected: boolean;
  deleteLabel: string;
  onClick: () => void;
  onDelete: () => void;
};

const SortablePresetItem = ({
  id,
  index,
  name,
  isSelected,
  deleteLabel,
  onClick,
  onDelete,
}: SortablePresetItemProps) => {
  const handleRef = useRef<HTMLDivElement>(null);
  const { ref, isDragging } = useSortable({ id, index, handle: handleRef });

  return (
    <div
      ref={ref}
      className={cnTw(
        'group relative flex w-full items-center transition-all duration-150',
        isSelected
          ? 'bg-primary-button-background-default/8 shadow-[inset_3px_0_0_0] shadow-icon-accent'
          : 'hover:bg-action-background-hover',
        isDragging && 'z-10 opacity-60',
      )}
    >
      <div
        ref={handleRef}
        className={cnTw(
          'flex shrink-0 cursor-grab items-center px-1.5 py-2.5 transition-opacity active:cursor-grabbing',
          isSelected
            ? 'text-icon-accent opacity-50 group-hover:opacity-80'
            : 'text-icon-default opacity-30 group-hover:opacity-60',
        )}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </div>
      <button type="button" className="min-w-0 flex-1 py-2.5 text-left" onClick={onClick}>
        <FootnoteText
          className={cnTw('w-full truncate', isSelected ? 'font-semibold text-text-primary' : 'text-text-secondary')}
        >
          {name}
        </FootnoteText>
      </button>
      <button
        type="button"
        aria-label={deleteLabel}
        className={cnTw(
          'mr-2 shrink-0 rounded p-1 text-icon-default opacity-0 transition-opacity',
          'group-hover:opacity-100 hover:text-text-negative focus-visible:opacity-100',
        )}
        onClick={onDelete}
      >
        <Icon name="delete" size={14} />
      </button>
    </div>
  );
};

// --- Type chip ---

type TypeChipProps = {
  active: boolean;
  onClick: () => void;
  label: string;
};

const TypeChip = ({ active, onClick, label }: TypeChipProps) => (
  <button
    type="button"
    className={cnTw(
      'rounded-full px-3 py-1 text-footnote transition-colors',
      active
        ? 'bg-icon-accent text-white'
        : 'border border-filter-border text-text-secondary hover:bg-action-background-hover',
    )}
    onClick={onClick}
  >
    {label}
  </button>
);
