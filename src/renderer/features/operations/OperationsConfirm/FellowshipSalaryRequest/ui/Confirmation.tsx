import { useStoreMap } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { SignButton } from '@/entities/operations';
import { SalaryRegisterConfirmation } from '@/features/fellowship-salary';
import { confirm } from '../model/confirm';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
};

export const Confirmation = ({ id, secondaryActionButton, hideSignButton, onGoBack }: Props) => {
  const { t } = useI18n();

  const record = useStoreMap({
    store: confirm.$confirmMap,
    keys: [id],
    fn: (value, [id]) => (id ? value[id] : null) ?? null,
  });

  if (nullable(record)) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4 px-5 py-4">
      <SalaryRegisterConfirmation
        account={record.meta.initiator}
        asset={record.meta.asset}
        chain={record.meta.chain}
        wallets={record.meta.wallets}
        fee={record.meta.fee}
      />

      <div className="mt-3 flex w-full justify-between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}

        <div className="flex gap-4">
          {secondaryActionButton}

          {!hideSignButton && (
            <SignButton
              isDefault={Boolean(secondaryActionButton)}
              type={(record.wallets.signatory || record.wallets.initiator)?.type}
              onClick={() => confirm.startSigning()}
            />
          )}
        </div>
      </div>
    </div>
  );
};
