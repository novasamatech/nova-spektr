import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { referendaPallet } from '@/shared/pallet/referenda';
import { Button } from '@/shared/ui';
import { referendumService } from '@/domains/collectives';
import { SignButton } from '@/entities/operations';
import { VotingConfirmation, votingStatusModel } from '@/features/fellowship-voting';
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
    fn: (value, [id]) => (id ? value[id] : null) ?? null,
  });

  useFlow(votingStatusModel.flow, {
    referendumId: confirm?.meta?.poll ? referendaPallet.helpers.toReferendumId(parseInt(confirm?.meta?.poll)) : null,
  });

  const referendum = useUnit(votingStatusModel.$referendum);
  const maxRank = useUnit(votingStatusModel.$maxRank);

  if (nullable(confirm) || nullable(referendum) || referendumService.isCompleted(referendum)) {
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
        referendum={referendum}
        maxRank={maxRank}
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
