import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { Alert, BaseModal, Button, InfoLink, InputFile, InputHint } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { importKeysModel, TypedImportedDerivation } from '@renderer/entities/wallet';
import { AccountId } from '@renderer/shared/core';
import { cnTw } from '@renderer/shared/lib/utils';
// @ts-ignore
import templateFile from '@renderer/assets/files/dd-template.yaml';

type Props = {
  isOpen: boolean;
  rootAccountId: AccountId;
  existingKeys: TypedImportedDerivation[];
  onClose: () => void;
};

export const ImportKeysModal = ({ isOpen, onClose, rootAccountId, existingKeys }: Props) => {
  const { t } = useI18n();
  const validationError = useUnit(importKeysModel.$validationError);
  const successReport = useUnit(importKeysModel.$successReport);

  useEffect(() => {
    if (rootAccountId && existingKeys) {
      importKeysModel.events.importStarted({ derivations: existingKeys, root: rootAccountId });
    }
  }, [rootAccountId, existingKeys]);

  const handleFileUpload = (file: File) => {
    const fileReader = new FileReader();
    fileReader.onloadend = (e) => {
      if (e.target?.result) {
        importKeysModel.events.fileUploaded(e.target['result'] as string);
      }
    };

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

  const handleContinue = () => {
    // send merged keys to other model
  };

  return (
    <BaseModal isOpen={isOpen} title={t('dynamicDerivations.importKeys.modalTitle')} onClose={onClose}>
      <div className="flex flex-col gap-y-4 items-start">
        <InputFile
          placeholder={t('dynamicDerivations.importKeys.fileInputPlaceholder')}
          accept=".yaml"
          className={cnTw('w-full h-[126px]', validationError && 'mb-2', successReport && 'mb-4')}
          invalid={Boolean(validationError?.error)}
          onChange={(file) => handleFileUpload(file)}
        />

        <InputHint active={Boolean(validationError)} variant="error" className="mt-2">
          {t(
            validationError?.error || '',
            validationError?.invalidPaths && {
              count: validationError.invalidPaths.length,
              invalidPath: validationError.invalidPaths.join(', '),
            },
          )}
        </InputHint>

        {successReport && (
          <Alert title={t('dynamicDerivations.importKeys.report.title')} variant="success">
            <Alert.Item withDot={false}>{getReportText()}</Alert.Item>
            {successReport.ignoredNetworks.map((chainId) => (
              <Alert.Item className="break-all" key={chainId}>
                {chainId}
              </Alert.Item>
            ))}
          </Alert>
        )}

        <InfoLink
          url={templateFile}
          className="gap-x-1 mt-2 px-3"
          iconName="import"
          iconPosition="right"
          download
          target="_self"
        >
          {t('dynamicDerivations.importKeys.downloadTemplateButton')}
        </InfoLink>
      </div>

      <div className="flex items-center justify-between pt-3">
        <Button variant="text">{t('dynamicDerivations.importKeys.backButton')}</Button>
        <Button disabled={!validationError?.error && Boolean(successReport)} onClick={handleContinue}>
          {t('dynamicDerivations.importKeys.continueButton')}
        </Button>
      </div>
    </BaseModal>
  );
};
