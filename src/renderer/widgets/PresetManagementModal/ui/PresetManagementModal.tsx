import { useUnit } from 'effector-react';
import { useCallback, useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Button, FootnoteText } from '@/shared/ui';
import { ConfirmModal, Modal, useNotification } from '@/shared/ui-kit';
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
  const presetCreated = useUnit(dashboardPresetsModel.presetCreated);
  const presetUpdated = useUnit(dashboardPresetsModel.presetUpdated);
  const presetDeleted = useUnit(dashboardPresetsModel.presetDeleted);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<PresetType>('filter');
  const [editFilters, setEditFilters] = useState<PresetFilterCriteria>(EMPTY_FILTERS);
  const [editSelectedIds, setEditSelectedIds] = useState<string[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingSelectNew, setPendingSelectNew] = useState(false);

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
    setEditType('filter');
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
      presetCreated(payload);
      setPendingSelectNew(true);
      toast.success(t('dashboard.presets.modal.createdToast', { name: trimmedName }));
    } else {
      presetUpdated({ id: selectedId, ...payload });
      toast.success(t('dashboard.presets.modal.savedToast', { name: trimmedName }));
    }
  };

  const handleDelete = () => {
    if (selectedId === null) return;

    const deletedName = editName;
    const currentIndex = presets.findIndex((p) => p.id === selectedId);
    presetDeleted(selectedId);
    setConfirmDeleteOpen(false);
    toast.success(t('dashboard.presets.modal.deletedToast', { name: deletedName }));

    const remaining = presets.filter((p) => p.id !== selectedId);
    if (remaining.length > 0) {
      const nextIndex = Math.min(currentIndex, remaining.length - 1);
      const next = remaining[nextIndex];
      if (next) selectPreset(next.id);
    } else {
      resetEditor();
    }
  };

  const isNewPreset = selectedId === null;
  const canSave = editName.trim().length > 0 && (editType === 'filter' || editSelectedIds.length > 0);

  return (
    <>
      <Modal isOpen={isOpen} size="lg" onToggle={(open) => !open && onClose()}>
        <Modal.Title close>{t('dashboard.presets.modal.title')}</Modal.Title>
        <Modal.Content disableScroll>
          <div className="flex h-full min-h-[400px]">
            {/* Left panel — preset list */}
            <div className="flex w-[200px] shrink-0 flex-col border-r border-divider">
              <div className="flex-1 overflow-y-auto">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={cnTw(
                      'flex w-full items-center gap-x-2 px-4 py-2.5 text-left transition-colors hover:bg-action-background-hover',
                      selectedId === preset.id && 'border-l-2 border-icon-accent bg-block-background-default',
                    )}
                    onClick={() => selectPreset(preset.id)}
                  >
                    <FootnoteText className="w-full truncate text-text-primary">{preset.name}</FootnoteText>
                  </button>
                ))}
              </div>

              <div className="border-t border-divider p-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-x-1.5 rounded px-3 py-1.5 text-footnote text-icon-accent transition-colors hover:bg-action-background-hover"
                  onClick={resetEditor}
                >
                  <span className="text-base leading-none">+</span>
                  <FootnoteText as="span" className="text-inherit">
                    {t('dashboard.presets.modal.newPreset')}
                  </FootnoteText>
                </button>
              </div>
            </div>

            {/* Right panel — editor */}
            <div className="flex min-w-0 flex-1 flex-col gap-y-4 overflow-y-auto px-5 py-4">
              {/* Preset type switcher */}
              <div className="flex gap-x-2">
                <TypeChip
                  active={editType === 'filter'}
                  label={t('dashboard.presets.modal.typeFilter')}
                  onClick={() => setEditType('filter')}
                />
                <TypeChip
                  active={editType === 'custom'}
                  label={t('dashboard.presets.modal.typeCustom')}
                  onClick={() => setEditType('custom')}
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
              <Button size="sm" variant="text" pallet="error" onClick={() => setConfirmDeleteOpen(true)}>
                {t('dashboard.presets.modal.delete')}
              </Button>
            )}
          </div>
          <div className="flex gap-x-3">
            <Button size="sm" variant="fill" pallet="secondary" onClick={onClose}>
              {t('dashboard.presets.modal.cancel')}
            </Button>
            <Button size="sm" variant="fill" pallet="primary" disabled={!canSave} onClick={handleSave}>
              {t('dashboard.presets.modal.save')}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      <ConfirmModal
        title={t('dashboard.presets.modal.deleteConfirmTitle')}
        description={t('dashboard.presets.modal.deleteConfirmDescription', { name: editName })}
        confirmText={t('dashboard.presets.modal.delete')}
        cancelText={t('dashboard.presets.modal.cancel')}
        type="warning"
        isOpen={confirmDeleteOpen}
        onToggle={setConfirmDeleteOpen}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
};

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
