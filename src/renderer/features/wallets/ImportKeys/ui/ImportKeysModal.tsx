import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { type DraftAccount, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Alert, Button, InfoLink, InputHint } from '@/shared/ui';
import { InputFile, Modal } from '@/shared/ui-kit';
import { TEMPLATE_GITHUB_LINK } from '../lib/constants';
import { importKeysUtils } from '../lib/import-keys-utils';
import { importKeysModel } from '../model/import-keys-model';

type Props = {
  isOpen: boolean;
  rootAccountId: AccountId;
  existingKeys: (DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>)[];
  onConfirm: (keys: (DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>)[]) => void;
  onClose: () => void;
};

export const ImportKeysModal = ({ isOpen, rootAccountId, existingKeys, onConfirm, onClose }: Props) => {
  const { t } = useI18n();

  const validationError = useUnit(importKeysModel.$validationError);
  const mergedKeys = useUnit(importKeysModel.$mergedKeys);
  const successReport = useUnit(importKeysModel.$successReport);

  useEffect(() => {
    if (!isOpen) return;

    importKeysModel.events.resetValues({
      root: rootAccountId,
      derivations: existingKeys,
    });
  }, [isOpen]);

  const handleFileUpload = (file: File) => {
    importKeysModel.events.fileUploaded(file);
  };

  const getReportText = () => {
    if (!successReport) return;

    const addedKeys = t('dynamicDerivations.importKeys.report.addedKeys', { count: successReport.addedKeys });
    const updatedNetworks = t('dynamicDerivations.importKeys.report.updatedNetworks', {
      count: successReport.updatedNetworks,
    });
    const duplicatedKeys = t('dynamicDerivations.importKeys.report.duplicatedKeys', {
      count: successReport.duplicatedKeys,
    });
    const ignoreNetworks = t('dynamicDerivations.importKeys.report.networksIgnored', {
      count: successReport.ignoredNetworks.length,
    });

    return `${addedKeys} ${updatedNetworks} ${successReport.duplicatedKeys ? duplicatedKeys : ''} ${
      successReport.ignoredNetworks.length ? ignoreNetworks : ''
    }`;
  };

  return (
    <Modal isOpen={isOpen} size="md" onToggle={(open) => !open && onClose()}>
      <Modal.Title close>{t('dynamicDerivations.importKeys.modalTitle')}</Modal.Title>
      <Modal.Content>
        <div className="mt-4 flex flex-col items-start gap-y-4 px-5">
          <div className="flex w-full flex-col gap-y-2">
            <div className="h-[126px]">
              <InputFile
                accept=".yaml,.txt"
                placeholder={t('dynamicDerivations.importKeys.fileInputPlaceholder')}
                invalid={nonNullable(validationError?.error)}
                onChange={handleFileUpload}
              />
            </div>

            <InputHint active={nonNullable(validationError)} variant="error">
              {validationError && importKeysUtils.getErrorsText(t, validationError.error, validationError.details)}
            </InputHint>
          </div>

          <Alert
            active={nonNullable(successReport)}
            title={t('dynamicDerivations.importKeys.report.title')}
            variant="success"
          >
            <Alert.Item withDot={false}>{getReportText()}</Alert.Item>
            {(successReport?.ignoredNetworks || []).map((chainId) => (
              <Alert.Item className="break-all" key={chainId}>
                {chainId}
              </Alert.Item>
            ))}
          </Alert>

          <InfoLink url={TEMPLATE_GITHUB_LINK} className="ml-2" iconName="import" iconPosition="right">
            {t('dynamicDerivations.importKeys.downloadTemplateButton')}
          </InfoLink>
        </div>
      </Modal.Content>
      <Modal.Footer align="end">
        <Button disabled={nonNullable(validationError?.error) || !successReport} onClick={() => onConfirm(mergedKeys)}>
          {t('dynamicDerivations.importKeys.continueButton')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
