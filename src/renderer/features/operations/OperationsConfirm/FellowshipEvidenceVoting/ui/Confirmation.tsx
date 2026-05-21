import { useStoreMap } from 'effector-react';
import { type ReactNode, memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { EvidenceVotingConfirmation } from '@/features/fellowship-evidence';
import { MultisigOperationDescriptionField } from '../../common/MultisigOperationDescriptionField';
import { confirmModel } from '../model/confirm-model';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
};

export const Confirmation = memo(({ id, secondaryActionButton, hideSignButton, onGoBack }: Props) => {
  const { t } = useI18n();

  const confirm = useStoreMap({
    store: confirmModel.$confirmMap,
    keys: [id],
    fn: (value, [id]) => (id ? value[id] : null) ?? null,
  });

  if (nullable(confirm) || nullable(confirm.meta)) return null;

  const { wallets, chain, asset, fee, aye, tracks, maxRank, evidence, votingMember, proposerMember, initiator } =
    confirm.meta;

  return (
    <Box padding={[4, 5]}>
      <EvidenceVotingConfirmation
        account={initiator}
        wallets={wallets}
        chain={chain}
        asset={asset}
        fee={fee}
        vote={aye ? 'Aye' : 'Nay'}
        tracks={tracks}
        maxRank={maxRank}
        votingMember={votingMember}
        proposerMember={proposerMember}
        evidence={evidence}
      />

      <MultisigOperationDescriptionField />

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
    </Box>
  );
});
