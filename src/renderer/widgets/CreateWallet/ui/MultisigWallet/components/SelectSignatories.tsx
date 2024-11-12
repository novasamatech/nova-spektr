import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
import { signatoryModel } from '../../../model/signatory-model';

import { Signatory } from './Signatory';

export const SelectSignatories = () => {
  const { t } = useI18n();

  const signatories = useUnit(signatoryModel.$signatories);

  const onAddSignatoryClick = () => {
    signatoryModel.events.addSignatory({ name: '', address: '' });
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-2">
        {signatories.map((value, index) => (
          <Signatory
            key={index}
            signatoryIndex={index}
            isOwnAccount={index === 0}
            signatoryName={value.name}
            signatoryAddress={value.address}
            onDelete={signatoryModel.events.deleteSignatory}
          />
        ))}
      </div>
      <div>
        <Button
          size="sm"
          variant="text"
          className="mt-4 h-8.5 justify-center"
          suffixElement={<Icon className="text-icon-primary" name="add" size={16} />}
          onClick={onAddSignatoryClick}
        >
          {t('createMultisigAccount.addNewSignatory')}
        </Button>
      </div>
    </div>
  );
};
