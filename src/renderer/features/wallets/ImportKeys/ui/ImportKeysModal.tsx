import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { Alert, BaseModal, Button, InfoLink, InputFile, InputHint } from '@shared/ui';
import type { AccountId, ChainAccount, ShardAccount, DraftAccount } from '@shared/core';
import { useI18n } from '@app/providers';
import { cnTw } from '@shared/lib/utils';
import { importKeysModel } from '../model/import-keys-model';
import { importKeysUtils } from '../lib/import-keys-utils';
import { TEMPLATE_GITHUB_LINK } from '@features/wallets/ImportKeys/lib/constants';

type Props = {
  isOpen: boolean;
  rootAccountId: AccountId;
  existingKeys: DraftAccount<ChainAccount | ShardAccount>[];
  onConfirm: (mergedKeys: DraftAccount<ChainAccount | ShardAccount>[]) => void;
  onClose: () => void;
};

export const ImportKeysModal = ({ isOpen, rootAccountId, existingKeys, onConfirm, onClose }: Props) => {
  const { t } = useI18n();
  const validationError = useUnit(importKeysModel.$validationError);
  const mergedKeys = useUnit(importKeysModel.$mergedKeys);
  const successReport = useUnit(importKeysModel.$successReport);

  useEffect(() => {
    if (isOpen) {
      importKeysModel.events.resetValues({ derivations: existingKeys, root: rootAccountId });
    }
  }, [isOpen]);

  const handleFileUpload = (file: File) => {
    const fileReader = new FileReader();

    fileReader.addEventListener(
      'loadend',
      (e) => {
        if (e.target?.result) {
          importKeysModel.events.fileUploaded(e.target['result'] as string);
        }
      },
      { once: true },
    );

    fileReader.readAsText(file);
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
    <BaseModal isOpen={isOpen} title={t('dynamicDerivations.importKeys.modalTitle')} onClose={onClose}>
      <div className="flex flex-col gap-y-4 items-start">
        <InputFile
          placeholder={t('dynamicDerivations.importKeys.fileInputPlaceholder')}
          accept=".yaml"
          className={cnTw('w-full h-[126px]', validationError && 'mb-2', successReport && 'mb-4')}
          invalid={Boolean(validationError?.error)}
          onChange={handleFileUpload}
        />

        <InputHint active={Boolean(validationError)} variant="error" className="mt-2">
          {validationError && importKeysUtils.getErrorsText(t, validationError.error, validationError.details)}
        </InputHint>

        <Alert
          active={Boolean(successReport)}
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

        <InfoLink url={TEMPLATE_GITHUB_LINK} className="gap-x-1 mt-2 px-3" iconName="import" iconPosition="right">
          {t('dynamicDerivations.importKeys.downloadTemplateButton')}
        </InfoLink>
      </div>

      <div className="flex items-center justify-between pt-3">
        <Button variant="text" onClick={onClose}>
          {t('dynamicDerivations.importKeys.backButton')}
        </Button>
        <Button disabled={Boolean(validationError?.error) || !successReport} onClick={() => onConfirm(mergedKeys)}>
          {t('dynamicDerivations.importKeys.continueButton')}
        </Button>
      </div>
    </BaseModal>
  );
};
