import { useGate, useStoreMap } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { SignButton } from '@/entities/operations';
// eslint-disable-next-line boundaries/entry-point
import { SetActiveConfirmation, setActive } from '@/features/fellowship-profile';
import { confirmModel } from '../model/confirm-model';
// eslint-disable-next-line boundaries/entry-point

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
};

export const Confirmation = ({ id, secondaryActionButton, hideSignButton, onGoBack }: Props) => {
  const { t } = useI18n();

  const confirm = useStoreMap({
    store: confirmModel.$confirmMap,
    keys: [id],
    fn: (value, [id]) => (id ? value[id] : null) ?? null,
  });

  useGate(setActive.flow, { isActive: confirm?.meta?.isActive ?? false });

  if (nullable(confirm)) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4 px-5 py-4">
      <SetActiveConfirmation
        account={confirm.meta.initiator}
        asset={confirm.meta.asset}
        chain={confirm.meta.chain}
        wallets={confirm.meta.wallets}
        fee={confirm.meta.fee}
        isActive={confirm.meta.isActive}
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
              type={confirm.wallets.signatory.type}
              onClick={confirmModel.startSigning}
            />
          )}
        </div>
      </div>
    </div>
  );
};
