import { TEST_IDS } from '@/shared/constants';
import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Alert, Button } from '@/shared/ui';

type Props = {
  wallet: Wallet | null;
  title: string;
  description: string;
  /**
   * Opens the existing wallet. The action is offered only for wallets the user
   * can actually switch to, i.e. not hidden ones.
   */
  onOpen?: () => void;
};

/**
 * Warning shown on a pairing form when the entered key / address already
 * belongs to a wallet of the same kind. Renders nothing without a wallet.
 */
export const ExistingWalletAlert = ({ wallet, title, description, onOpen }: Props) => {
  const { t } = useI18n();

  if (nullable(wallet)) return null;

  const canOpen = nonNullable(onOpen) && nullable(wallet.hiddenReason);

  return (
    <Alert active variant="warn" title={title} dataTestId={TEST_IDS.ONBOARDING.EXISTING_WALLET_ALERT}>
      <Alert.Item withDot={false}>{description}</Alert.Item>
      {canOpen && (
        <Alert.Item withDot={false}>
          <Button size="sm" variant="text" onClick={onOpen}>
            {t('onboarding.openExistingWalletButton')}
          </Button>
        </Alert.Item>
      )}
    </Alert>
  );
};
