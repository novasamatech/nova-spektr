import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { Alert, BaseModal, Button, InfoLink, InputFile, InputHint } from '@shared/ui';
import { useI18n } from '@app/providers';
import { AccountId, ChainAccount, ShardAccount } from '@shared/core';
import { cnTw } from '@shared/lib/utils';
// @ts-ignore
import templateFile from '@shared/assets/files/dd-template.yaml';
import { importKeysModel } from '../model/import-keys-model';
import { DraftAccount } from '@shared/core/types/account';

type Props = {
  isOpen: boolean;
  rootAccountId: AccountId;
  existingKeys: DraftAccount<ShardAccount | ChainAccount>[];
  onClose: () => void;
  onConfirm: (mergedKeys: DraftAccount<ShardAccount | ChainAccount>[]) => void;
};

export const ImportKeysModal = ({ isOpen, rootAccountId, existingKeys, onClose, onConfirm }: Props) => {
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

  const handleContinue = () => {
    onConfirm(mergedKeys);
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
          {t(
            validationError?.error || '',
            validationError?.invalidPaths && {
              count: validationError.invalidPaths.length,
              invalidPath: validationError.invalidPaths.join(', '),
            },
          )}
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

        <InfoLink url={templateFile} className="gap-x-1 mt-2 px-3" iconName="import" iconPosition="right" download>
          {t('dynamicDerivations.importKeys.downloadTemplateButton')}
        </InfoLink>
      </div>

      <div className="flex items-center justify-between pt-3">
        <Button variant="text" onClick={onClose}>
          {t('dynamicDerivations.importKeys.backButton')}
        </Button>
        <Button disabled={Boolean(validationError?.error) || !successReport} onClick={handleContinue}>
          {t('dynamicDerivations.importKeys.continueButton')}
        </Button>
      </div>
    </BaseModal>
  );
};
