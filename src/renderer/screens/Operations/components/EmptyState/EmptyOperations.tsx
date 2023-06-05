import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { BodyText } from '@renderer/components/ui-redesign';
import { Account } from '@renderer/domain/account';

type Props = {
  multisigAccount: Account | null;
  isEmptyFromFilters: boolean;
};

const EmptyOperations = ({ multisigAccount, isEmptyFromFilters }: Props) => {
  const { t } = useI18n();

  const emptyText = multisigAccount
    ? isEmptyFromFilters
      ? 'operations.noOperationsFilters'
      : 'operations.noOperationsDescription'
    : 'operations.noOperationsWalletNotMulti';

  return (
    <div className="flex flex-col items-center justify-center gap-y-8 flex-1 w-full">
      <Icon as="img" name="emptyList" alt={t('operations.noOperationsDescription')} size={178} />
      <BodyText align="center" className="text-text-tertiary max-w-[340px]">
        {t(emptyText)}
      </BodyText>
    </div>
  );
};

export default EmptyOperations;
