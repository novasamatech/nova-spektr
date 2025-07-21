import { useUnit } from 'effector-react';
import { type ClipboardEvent, type FormEvent, useState } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { Button, FootnoteText, SmallTitleText } from '@/shared/ui';
import { Checkbox, Input } from '@/shared/ui-kit';
import { Step } from '../lib/types';
import { removeProxyModel } from '../model/remove-proxy-model';

type Props = {
  onGoBack: () => void;
};

export const Warning = ({ onGoBack }: Props) => {
  const isKill = useUnit(removeProxyModel.$isPureProxiedNeedToBeKilled);

  if (isKill) {
    return <WarningKill onGoBack={onGoBack} />;
  }

  return <WarningRemove onGoBack={onGoBack} />;
};

const PASSPHRASE = 'I understand that I will not be able to manage this wallet';

const WarningKill = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const [passphrase, setPassphrase] = useState('');
  const [isCorrectProxy, setIsCorrectProxy] = useState(false);
  const [isInaccessible, setIsInaccessible] = useState(false);
  const [isIrreversible, setIsIrreversible] = useState(false);
  const [lossOfFunds, setLossOfFunds] = useState(false);

  const isPassphraseValid = passphrase.toLowerCase().trim() === PASSPHRASE.toLowerCase();
  const areAllCheckboxesChecked = isCorrectProxy && isInaccessible && isIrreversible && lossOfFunds;
  const canSubmit = isPassphraseValid && areAllCheckboxesChecked;

  const revokeAuthority = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) {
      removeProxyModel.stepChanged(Step.INIT);
    }
  };

  const handlePaste = (event: ClipboardEvent) => {
    event.preventDefault();
  };

  return (
    <div className="px-5 pb-4">
      <form id="remove-pure-proxy-warning-form" className="mt-4 flex flex-col gap-y-4" onSubmit={revokeAuthority}>
        <FootnoteText as="p"> {t('pureProxyRemove.warning.warningMessage')}</FootnoteText>
        <Input
          placeholder={t('general.input.descriptionPlaceholder')}
          invalid={passphrase !== '' && !isPassphraseValid}
          value={passphrase}
          onChange={setPassphrase}
          onPaste={handlePaste}
        />
        <FootnoteText as="p" className="text-text-tertiary">
          <Trans t={t} i18nKey="pureProxyRemove.warning.inputHint" />
        </FootnoteText>
        <div>
          <Checkbox checked={isCorrectProxy} onChange={setIsCorrectProxy}>
            <FootnoteText>
              <Trans t={t} i18nKey="pureProxyRemove.warning.isCorrectProxyCheckbox" />
            </FootnoteText>
          </Checkbox>
        </div>
        <div>
          <Checkbox checked={isIrreversible} onChange={setIsIrreversible}>
            <FootnoteText>
              <Trans t={t} i18nKey="pureProxyRemove.warning.isIrreversibleCheckbox" />
            </FootnoteText>
          </Checkbox>
        </div>
        <div>
          <Checkbox checked={isInaccessible} onChange={setIsInaccessible}>
            <FootnoteText>
              <Trans t={t} i18nKey="pureProxyRemove.warning.isInaccessibleCheckbox" />
            </FootnoteText>
          </Checkbox>
        </div>
        <div>
          <Checkbox checked={lossOfFunds} onChange={setLossOfFunds}>
            <FootnoteText>
              <Trans t={t} i18nKey="pureProxyRemove.warning.lossOfFundsCheckbox" />
            </FootnoteText>
          </Checkbox>
        </div>
      </form>

      <div className="mt-4 flex items-center justify-between">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>
        <Button form="remove-pure-proxy-warning-form" pallet="error" type="submit" disabled={!canSubmit}>
          {t('pureProxyRemove.warning.revokeAuthorityButton')}
        </Button>
      </div>
    </div>
  );
};

const WarningRemove = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const onConfirm = () => {
    removeProxyModel.stepChanged(Step.INIT);
  };

  return (
    <div className="px-5 pb-4">
      <div className="mt-4 flex flex-col gap-y-4">
        <SmallTitleText align="center" className="mb-2">
          {t('walletDetails.common.confirmRemoveProxyTitle')}
        </SmallTitleText>
        <FootnoteText className="text-text-tertiary" align="center">
          {t('walletDetails.common.confirmRemoveProxyDescription')}
        </FootnoteText>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button variant="text" onClick={onGoBack}>
          {t('walletDetails.common.confirmRemoveProxyCancel')}
        </Button>
        <Button pallet="error" onClick={onConfirm}>
          {t('walletDetails.common.confirmRemoveProxySubmit')}
        </Button>
      </div>
    </div>
  );
};
