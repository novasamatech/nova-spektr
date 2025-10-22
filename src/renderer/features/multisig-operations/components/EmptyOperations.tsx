import { Trans } from 'react-i18next';

import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BodyText, TitleText } from '@/shared/ui';
import { Graphics } from '@/shared/ui-kit';

type Props = {
  multisigAccount: MultisigAccount | FlexibleMultisigAccount | null;
  isEmptyFromFilters: boolean;
};

export const EmptyOperations = ({ multisigAccount, isEmptyFromFilters }: Props) => {
  const { t } = useI18n();

  const emptyText = multisigAccount
    ? isEmptyFromFilters
      ? 'operations.noOperationsFilters'
      : 'operations.noOperationsDescription'
    : 'operations.noOperationsWalletNotMulti';

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-y-6">
      <Graphics name="emptyList" alt={t('operations.noOperationsDescription')} size={178} />

      <div className="flex flex-col items-center gap-y-4">
        {multisigAccount && <TitleText>{t('operations.noOperationsTitle')}</TitleText>}

        <BodyText align="center" className="max-w-[560px] text-text-tertiary">
          <Trans t={t} i18nKey={emptyText} />
        </BodyText>
      </div>
    </div>
  );
};
