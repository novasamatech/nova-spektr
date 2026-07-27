import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatBalance, toAddress, toShortAddress } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { useNotification } from '@/shared/ui-kit';
import { useAccountName, useWalletName } from '@/domains/network';
import { navigationModel } from '@/features/navigation';
import { type DraftToastOperation } from '../model/draft-toast';
import { draftToast } from '../model/instance';

/** Static keys, so the i18n scanner sees every string this component can show. */
const OPERATION_KEY: Record<DraftToastOperation, string> = {
  claim: 'dashboard.staking.draftToast.operation.claim',
  unbond: 'dashboard.staking.draftToast.operation.unbond',
  addStake: 'dashboard.staking.draftToast.operation.addStake',
};

const TOAST_DURATION = 8000;

/**
 * Frame F10: a draft saved from a staking action announces itself once,
 * bottom-left, and gets out of the way.
 *
 * Headless — it renders nothing and exists only to turn a store into a sonner
 * call, which is the one thing the model cannot do. Mounted globally through
 * `modalsSlot` because a draft can be saved from the dashboard, from a drawer
 * or from a modal, and the toast must outlive all three.
 *
 * Plain function component (never `memo`/`lazy`/`forwardRef`): the slot render
 * system calls it directly as a function.
 */
export const DraftCreatedToast = () => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const navigateTo = useUnit(navigationModel.events.navigateTo);
  const [context, toastShown] = useUnit([draftToast.$toast, draftToast.toastShown]);

  const accountName = useAccountName({ accountId: context?.signerAccountId, chain: context?.chain });
  const walletName = useWalletName(context?.signerWallet);

  useEffect(() => {
    if (!context) return;

    const { formatted, suffix } = formatBalance(context.amount, context.asset.precision);
    const address = context.signerAccountId
      ? toShortAddress(toAddress(context.signerAccountId, { prefix: context.chain.addressPrefix }))
      : '';

    toast.success(t('dashboard.staking.draftToast.title'), {
      description: t('dashboard.staking.draftToast.summary', {
        operation: t(OPERATION_KEY[context.operation], {
          amount: `${formatted}${suffix} ${context.asset.symbol}`,
        }),
        signer: accountName || walletName || address,
        network: context.chain.name,
      }),
      position: 'bottom-left',
      duration: TOAST_DURATION,
      action: {
        label: t('dashboard.staking.draftToast.viewDrafts'),
        onClick: () => navigateTo(Paths.OPERATIONS),
      },
    });

    toastShown();
  }, [context, accountName, walletName]);

  return null;
};
