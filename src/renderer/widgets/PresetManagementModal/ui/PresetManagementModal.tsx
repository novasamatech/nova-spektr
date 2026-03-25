import { move } from '@dnd-kit/helpers';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { useUnit } from 'effector-react';
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon } from '@/shared/ui';
import { Modal, useNotification } from '@/shared/ui-kit';
import {
  type PresetFilterCriteria,
  type PresetType,
  EMPTY_FILTERS,
  dashboardPresetsModel,
} from '@/aggregates/dashboard-presets';
import { dashboardModel } from '@/pages/Dashboard/model/dashboard-model';

import { CustomAccountSelector } from './CustomAccountSelector';
import { MatchedAccountsPreview } from './MatchedAccountsPreview';
import { PresetFilterEditor } from './PresetFilterEditor';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const PresetManagementModal = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();
  const { toast } = useNotification();

  const presets = useUnit(dashboardPresetsModel.$presets);
  const allEntries = useUnit(dashboardModel.$allEntries);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<PresetType>('filter');
  const [editFilters, setEditFilters] = useState<PresetFilterCriteria>(EMPTY_FILTERS);
  const [editSelectedIds, setEditSelectedIds] = useState<string[]>([]);
  const [pendingSelectNew, setPendingSelectNew] = useState(false);

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
      setEditFilters(preset.filters);
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
      dashboardPresetsModel.presetsReordered(dragIdsRef.current);
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
      dashboardPresetsModel.presetCreated(payload);
      setPendingSelectNew(true);
      toast.success(t('dashboard.presets.modal.createdToast', { name: trimmedName }));
    } else {
      dashboardPresetsModel.presetUpdated({ id: selectedId, ...payload });
      toast.success(t('dashboard.presets.modal.savedToast', { name: trimmedName }));
    }
  };

  const handleDelete = () => {
    if (selectedId === null) return;

    const deletedPreset = presetsById.get(selectedId);
    if (!deletedPreset) return;

    const deletedIndex = presets.findIndex((p) => p.id === selectedId);
    dashboardPresetsModel.presetDeleted(selectedId);

    toast.success(t('dashboard.presets.modal.deletedToast', { name: deletedPreset.name }), {
      action: {
        label: t('general.button.undoButton'),
        onClick: () => dashboardPresetsModel.presetRestored({ preset: deletedPreset, index: deletedIndex }),
      },
    });

    const remaining = presets.filter((p) => p.id !== selectedId);
    if (remaining.length > 0) {
      const nextIndex = Math.min(deletedIndex, remaining.length - 1);
      const next = remaining[nextIndex];
      if (next) selectPreset(next.id);
    } else {
      resetEditor();
    }
  };

  const isNewPreset = selectedId === null;
  const canSave = editName.trim().length > 0 && (editType === 'filter' || editSelectedIds.length > 0);

  return (
    <Modal isOpen={isOpen} size="lg" preventOutsideClick onToggle={(open) => !open && onClose()}>
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
                      onClick={() => selectPreset(id)}
                    />
                  );
                })}
              </div>
            </DragDropProvider>

            <div className="border-t border-divider p-2">
              <button
                type="button"
                className={cnTw(
                  'flex w-full items-center justify-center gap-x-1.5 rounded px-3 py-1.5 text-footnote transition-colors hover:bg-action-background-hover',
                  isNewPreset ? 'bg-icon-accent text-white' : 'text-icon-accent',
                )}
                onClick={resetEditor}
              >
                <span className="text-base leading-none">+</span>
                <FootnoteText as="span" className="text-inherit">
                  {t('dashboard.presets.modal.newPreset')}
                </FootnoteText>
              </button>
            </div>
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

            {editType === 'filter' ? (
              <>
                <PresetFilterEditor
                  name={editName}
                  filters={editFilters}
                  onNameChange={setEditName}
                  onFiltersChange={setEditFilters}
                />
                <MatchedAccountsPreview allEntries={allEntries} filters={editFilters} />
              </>
            ) : (
              <CustomAccountSelector
                name={editName}
                allEntries={allEntries}
                selectedIds={editSelectedIds}
                onNameChange={setEditName}
                onSelectedIdsChange={setEditSelectedIds}
              />
            )}
          </div>
        </div>
      </Modal.Content>

      <Modal.Footer align="between">
        <div>
          {!isNewPreset && (
            <button
              type="button"
              className="flex items-center gap-x-1.5 rounded px-2 py-1.5 text-footnote text-text-tertiary transition-colors hover:bg-action-background-hover hover:text-text-negative"
              onClick={handleDelete}
            >
              <Icon name="delete" size={14} />
              {t('dashboard.presets.modal.delete')}
            </button>
          )}
        </div>
        <Button size="sm" variant="fill" pallet="primary" disabled={!canSave} onClick={handleSave}>
          {t('dashboard.presets.modal.save')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

// --- Sortable preset item ---

type SortablePresetItemProps = {
  id: string;
  index: number;
  name: string;
  isSelected: boolean;
  onClick: () => void;
};

const SortablePresetItem = ({ id, index, name, isSelected, onClick }: SortablePresetItemProps) => {
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
      <button type="button" className="min-w-0 flex-1 py-2.5 pr-4 text-left" onClick={onClick}>
        <FootnoteText
          className={cnTw('w-full truncate', isSelected ? 'font-semibold text-text-primary' : 'text-text-secondary')}
        >
          {name}
        </FootnoteText>
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
