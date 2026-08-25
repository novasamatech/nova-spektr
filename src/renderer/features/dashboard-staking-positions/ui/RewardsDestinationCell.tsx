import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAccountId, toAddress, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { CaptionText, FootnoteText } from '@/shared/ui';
import { type Payee } from '@/domains/staking';
import { NamedAccount } from '@/widgets/NameResolver';

import { StatCellSkeleton } from './StatCellSkeleton';

type Props = {
  payee: Payee | null;
  payeeLoaded: boolean;
  chain: Chain;
  /** The ledger's stash — what a `Stash` destination resolves to. */
  stash: AccountId;
};

/**
 * The body of the drawer's Rewards stat cell.
 *
 * `null` is two different facts — the subscription has not answered, or the
 * chain holds no destination — and they must not look the same: a shimmer says
 * "not yet", a dash says "nothing". `Controller` is legacy and read-only; the
 * flow cannot select it, but a position may still carry it.
 */
export const RewardsDestinationCell = ({ payee, payeeLoaded, chain, stash }: Props) => {
  const { t } = useI18n();

  if (!payeeLoaded) {
    return <StatCellSkeleton />;
  }

  if (payee === null) {
    return <FootnoteText className="text-text-tertiary">{t('dashboard.staking.positions.noValue')}</FootnoteText>;
  }

  if (payee === 'Staked') {
    return (
      <FootnoteText className="text-text-secondary">
        {t('dashboard.staking.positions.detail.rewardsDestination.restaked')}
      </FootnoteText>
    );
  }

  if (payee === 'Controller') {
    return (
      <FootnoteText className="text-text-secondary">
        {t('dashboard.staking.positions.detail.rewardsDestination.controller')}
      </FootnoteText>
    );
  }

  if (payee === 'Stash') {
    return (
      <div className="flex flex-col">
        <FootnoteText className="text-text-secondary">
          {t('dashboard.staking.positions.detail.rewardsDestination.stash')}
        </FootnoteText>
        <CaptionText className="text-text-tertiary">
          {toShortAddress(toAddress(stash, { prefix: chain.addressPrefix }))}
        </CaptionText>
      </div>
    );
  }

  // The payout account — a wallet account, a contact or a bare address. The
  // resolver finds whichever name the app knows for it.
  return (
    <NamedAccount
      accountId={toAccountId(payee.Account)}
      chain={chain}
      variant="short"
      iconSize={16}
      walletNameAs="fallback"
      hideExplorers
    />
  );
};
