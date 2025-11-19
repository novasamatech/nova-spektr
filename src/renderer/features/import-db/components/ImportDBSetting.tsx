import { deleteDb, exportDb } from '@/shared/api/storage';
import { useI18n } from '@/shared/i18n';
import { downloadFiles } from '@/shared/lib/utils';
import { BodyText, Button, Icon, Plate } from '@/shared/ui';

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
      <BodyText className="flex items-center justify-center gap-1 text-alert">
        <Icon name="warn" size={12} className="text-inherit" />
        {/* eslint-disable i18next/no-literal-string */}
        <span>DEV MODE</span>
      </BodyText>
      <Button
        pallet="secondary"
        className="w-full border border-alert bg-alert-background-warning"
        onClick={exportDatabase}
      >
        {t('importDB.exportButton')}
      </Button>
      <Button
        pallet="secondary"
        className="w-full border border-negative-action-background bg-alert-background-negative"
        onClick={deleteDatabase}
      >
        {t('importDB.deleteButton')}
      </Button>
    </Plate>
  );
};
