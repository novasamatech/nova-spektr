import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { ChainIcon } from '@/shared/ui-entities';
import { type LabelVariant, Label } from '@/shared/ui-kit';
import { NamedAccount } from '@/widgets/NameResolver';
import { type SigningMode } from '../lib';
import { validatorSelectionModel } from '../model/validator-selection-model';

/**
 * Green reads "this app can sign it", indigo "someone else will", grey "nobody
 * can" - the same three-way distinction the footer and the table repeat.
 */
const SIGNING_MODE_VARIANT: Record<SigningMode, LabelVariant> = {
  local: 'green',
  draft: 'purple',
  watchOnly: 'gray',
};

const Chip = ({ children }: PropsWithChildren) => (
  <div className="flex h-8 max-w-64 min-w-0 items-center gap-x-2 rounded-2xl bg-input-background-disabled px-2.5">
    {children}
  </div>
);

export const SelectionHeader = () => {
  const { t } = useI18n();

  const { chain, initiator, initiatorWallet, signingMode, selectedCount, maxNominations } = useUnit({
    chain: validatorSelectionModel.$chain,
    initiator: validatorSelectionModel.$initiator,
    initiatorWallet: validatorSelectionModel.$initiatorWallet,
    signingMode: validatorSelectionModel.$signingMode,
    selectedCount: validatorSelectionModel.$selectedCount,
    maxNominations: validatorSelectionModel.$maxNominations,
  });

  return (
    <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
      {nonNullable(initiator) ? (
        <Chip>
          <NamedAccount
            accountId={initiator.accountId}
            chain={chain ?? undefined}
            wallet={initiatorWallet ?? undefined}
            iconSize={18}
            variant="short"
          />
        </Chip>
      ) : null}

      {nonNullable(chain) ? (
        <Chip>
          <ChainIcon chain={chain} size={18} />
          <FootnoteText className="truncate">{chain.name}</FootnoteText>
        </Chip>
      ) : null}

      {/*
        Only when the mode changes what the user can do. "Local wallet" is the
        ordinary case and the table behaves exactly as it looks, so the chip was
        stating the absence of a caveat; watch-only and draft both disable or
        redirect the submit, and the chip is where that is announced.
      */}
      {signingMode === 'local' ? null : (
        <Label variant={SIGNING_MODE_VARIANT[signingMode]}>
          {t(`staking.validatorSelection.signingMode.${signingMode}`)}
        </Label>
      )}

      <Label variant="blue">
        {t('staking.validatorSelection.selectedChip', { selected: selectedCount, max: maxNominations })}
      </Label>
    </div>
  );
};
