import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, FootnoteText } from '@/shared/ui';
import { ConfirmModal, Modal } from '@/shared/ui-kit';
import { type PresetFilterCriteria, EMPTY_FILTERS, dashboardPresetsModel } from '@/aggregates/dashboard-presets';
import { dashboardModel } from '@/pages/Dashboard/model/dashboard-model';

import { MatchedAccountsPreview } from './MatchedAccountsPreview';
import { PresetFilterEditor } from './PresetFilterEditor';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const PresetManagementModal = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();

  const presets = useUnit(dashboardPresetsModel.$presets);
  const allEntries = useUnit(dashboardModel.$allEntries);
  const presetCreated = useUnit(dashboardPresetsModel.presetCreated);
  const presetUpdated = useUnit(dashboardPresetsModel.presetUpdated);
  const presetDeleted = useUnit(dashboardPresetsModel.presetDeleted);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editFilters, setEditFilters] = useState<PresetFilterCriteria>(EMPTY_FILTERS);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  // pendingSelectNew: after creating a new preset, auto-select the newest one
  const [pendingSelectNew, setPendingSelectNew] = useState(false);

  // When modal opens, select the first preset if any
  useEffect(() => {
    if (isOpen && presets.length > 0 && selectedId === null) {
      const first = presets[0];
      if (first) {
        setSelectedId(first.id);
        setEditName(first.name);
        setEditFilters(first.filters);
      }
    }
    if (!isOpen) {
      setSelectedId(null);
    }
  }, [isOpen]);

  // Auto-select new preset after creation
  useEffect(() => {
    if (pendingSelectNew && presets.length > 0) {
      // The newly created preset will be last in the array
      const newest = presets[presets.length - 1];
      if (newest) {
        setSelectedId(newest.id);
        setEditName(newest.name);
        setEditFilters(newest.filters);
      }
      setPendingSelectNew(false);
    }
  }, [presets, pendingSelectNew]);

  const handleSelectPreset = (id: string) => {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    setSelectedId(id);
    setEditName(preset.name);
    setEditFilters(preset.filters);
  };

  const handleNewPreset = () => {
    setSelectedId(null);
    setEditName('');
    setEditFilters(EMPTY_FILTERS);
  };

  const handleSave = () => {
    if (!editName.trim()) return;

    if (selectedId === null) {
      // Creating new preset
      presetCreated({ name: editName, filters: editFilters });
      setPendingSelectNew(true);
    } else {
      presetUpdated({ id: selectedId, name: editName, filters: editFilters });
    }
  };

  const handleDelete = () => {
    if (selectedId === null) return;

    const currentIndex = presets.findIndex((p) => p.id === selectedId);
    presetDeleted(selectedId);
    setConfirmDeleteOpen(false);

    // Auto-select next or previous preset
    const remaining = presets.filter((p) => p.id !== selectedId);
    if (remaining.length > 0) {
      const nextIndex = Math.min(currentIndex, remaining.length - 1);
      const next = remaining[nextIndex];
      if (next) {
        setSelectedId(next.id);
        setEditName(next.name);
        setEditFilters(next.filters);
      }
    } else {
      setSelectedId(null);
      setEditName('');
      setEditFilters(EMPTY_FILTERS);
    }
  };

  const isNewPreset = selectedId === null;
  const canSave = editName.trim().length > 0;

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
                    className={[
                      'flex w-full items-center px-4 py-2.5 text-left transition-colors hover:bg-action-background-hover',
                      selectedId === preset.id ? 'border-l-2 border-icon-accent bg-block-background-default' : '',
                    ].join(' ')}
                    onClick={() => handleSelectPreset(preset.id)}
                  >
                    <FootnoteText className="w-full truncate text-text-primary">{preset.name}</FootnoteText>
                  </button>
                ))}
              </div>

              <div className="border-t border-divider p-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-x-1.5 rounded px-3 py-1.5 text-footnote text-icon-accent transition-colors hover:bg-action-background-hover"
                  onClick={handleNewPreset}
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
              <PresetFilterEditor
                name={editName}
                filters={editFilters}
                onNameChange={setEditName}
                onFiltersChange={setEditFilters}
              />
              <MatchedAccountsPreview allEntries={allEntries} filters={editFilters} />
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
