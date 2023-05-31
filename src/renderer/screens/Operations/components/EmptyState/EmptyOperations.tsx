import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { BodyText } from '@renderer/components/ui-redesign';

// TODO move to shared and add label as a prop since empty list state the same for assets
const EmptyOperations = () => {
  const { t } = useI18n();

  // TODO add wallet check here when new wallet management will be implemented
  const walletIsMulti = true;

  return (
    <div className="flex flex-col items-center justify-center gap-y-8 w-full h-full">
      <Icon as="img" name="emptyList" alt={t('operations.noOperationsDescription')} size={178} />
      <BodyText align="center" className="text-text-tertiary max-w-[340px]">
        {walletIsMulti ? t('operations.noOperationsDescription') : t('operations.noOperationsWalletNotMulti')}
      </BodyText>
    </div>
  );
};

export default EmptyOperations;
