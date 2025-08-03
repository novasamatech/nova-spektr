import { deleteDb, exportDb } from '@/shared/api/storage';
import { useI18n } from '@/shared/i18n';
import { BodyText, Button, Icon, Plate } from '@/shared/ui';
import { downloadFiles } from '@/features/wallets/ExportKeys';

export const ImportDBSetting = () => {
  const { t } = useI18n();

  const exportDatabase = () => {
    exportDb().then((data) => {
      downloadFiles([data]);
    });
  };
  const deleteDatabase = () => {
    deleteDb();
    window.location.reload();
  };

  return (
    <Plate className="flex flex-col gap-2">
      <BodyText className="text-alert flex items-center justify-center gap-1">
        <Icon name="warn" size={12} className="text-inherit" />
        {/* eslint-disable i18next/no-literal-string */}
        <span>DEV MODE</span>
      </BodyText>
      <Button
        pallet="secondary"
        className="border-alert bg-alert-background-warning w-full border"
        onClick={exportDatabase}
      >
        {t('importDB.exportButton')}
      </Button>
      <Button
        pallet="secondary"
        className="border-negative-action-background bg-alert-background-negative w-full border"
        onClick={deleteDatabase}
      >
        {t('importDB.deleteButton')}
      </Button>
    </Plate>
  );
};
