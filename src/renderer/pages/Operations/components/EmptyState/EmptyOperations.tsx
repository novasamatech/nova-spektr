import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BodyText, Icon } from '@/shared/ui';

type Props = {
  multisigAccount: MultisigAccount | FlexibleMultisigAccount | null;
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
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-y-8">
      <Icon as="img" name="emptyList" alt={t('operations.noOperationsDescription')} size={178} />
      <BodyText align="center" className="max-w-[340px] text-text-tertiary">
        {t(emptyText)}
      </BodyText>
    </div>
  );
};

export default EmptyOperations;
