import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
import { signatoryModel } from '../../../model/signatory-model';

import { Signatory } from './Signatory';

export const SelectSignatories = () => {
  const { t } = useI18n();

  const signatories = useUnit(signatoryModel.$signatories);

  return (
    <div className="flex flex-1 flex-col gap-y-4">
      <div className="flex flex-col gap-y-2">
        {signatories.map((value, index) => (
          <Signatory
            key={`${value.address}_${index}`}
            isOwnAccount={index === 0}
            signatoryIndex={index}
            signatoryName={value.name}
            signatoryAddress={value.address}
            selectedWalletId={value.walletId}
            onDelete={signatoryModel.events.deleteSignatory}
          />
        ))}
      </div>
      <Button
        size="sm"
        variant="text"
        className="h-8.5 w-max justify-center"
        suffixElement={<Icon className="text-icon-primary" name="add" size={16} />}
        onClick={() => signatoryModel.events.addSignatory({ name: '', address: '', walletId: '' })}
      >
        {t('createMultisigAccount.addNewSignatory')}
      </Button>
    </div>
  );
};
