import { useStoreMap } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { SignButton } from '@/entities/operations';
// eslint-disable-next-line boundaries/entry-point
import { VotingConfirmation } from '@/features/fellowship-voting/components/VotingConfirmation';
import { confirmModel } from '../model/confirm-model';

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
    fn: (value, [id]) => (id ? value[id] : (null ?? null)),
  });

  if (nullable(confirm)) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4 px-5 py-4">
      <VotingConfirmation
        account={confirm.accounts.initiator}
        asset={confirm.meta.asset}
        chain={confirm.meta.chain}
        vote={confirm.meta.aye ? 'aye' : 'nay'}
        wallets={confirm.meta.wallets}
        fee={confirm.meta.fee}
        rank={confirm.meta.rank}
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
              type={(confirm.wallets.signer || confirm.wallets.initiator)?.type}
              onClick={() => {
                confirmModel.events.sign();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
