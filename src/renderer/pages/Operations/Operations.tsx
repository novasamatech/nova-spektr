import { useI18n } from '@/shared/i18n';
import { Header } from '@/shared/ui';
// eslint-disable-next-line boundaries/entry-point
import { Operations as OperationsList } from '@/features/multisig-operations/components/Operations';

export const Operations = () => {
  const { t } = useI18n();

  return (
    <div className="relative flex h-full flex-col items-center">
      <Header title={t('operations.title')} />

      <OperationsList />
    </div>
  );
};
