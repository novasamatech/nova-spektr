import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Alert, Button } from '@/shared/ui';
import { pairingFormModel } from '../model/pairing-form-model';

/**
 * Shown on the manage step when the scanned key already belongs to a paired
 * vault wallet. The caller disables its submit button while this is active.
 */
export const ExistingWalletAlert = () => {
  const { t } = useI18n();
  const existingWallet = useUnit(pairingFormModel.$existingWallet);

  if (nullable(existingWallet)) return null;

  return (
    <div className="px-5">
      <Alert
        active
        variant="warn"
        title={t('onboarding.vault.alreadyAddedTitle')}
        dataTestId="vault-already-added-alert"
      >
        <Alert.Item withDot={false}>
          {t('onboarding.vault.alreadyAddedDescription', { name: existingWallet.name })}
        </Alert.Item>
        {nullable(existingWallet.hiddenReason) && (
          <Alert.Item withDot={false}>
            <Button size="sm" variant="text" onClick={() => pairingFormModel.openExistingWallet()}>
              {t('onboarding.vault.openExistingWalletButton')}
            </Button>
          </Alert.Item>
        )}
      </Alert>
    </div>
  );
};
