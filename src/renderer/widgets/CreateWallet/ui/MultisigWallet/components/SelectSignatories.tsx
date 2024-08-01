import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { type Chain } from '@shared/core';
import { Button, Icon } from '@shared/ui';
import { signatoryModel } from '../../../model/signatory-model';

import { Signatory } from './Signatory';

type Props = {
  chain: Chain;
};

export const SelectSignatories = ({ chain }: Props) => {
  const { t } = useI18n();

  const signatories = useUnit(signatoryModel.$signatories);

  const onAddSignatoryClick = () => {
    signatoryModel.events.signatoriesChanged({ index: signatories.size, name: '', address: '' });
  };

  const onDeleteSignatoryClick = (index: number) => {
    signatoryModel.events.signatoryDeleted(index);
  };

  return (
    <div className="max-h-full flex flex-col flex-1">
      <div className="flex flex-col gap-2">
        {Array.from(signatories.keys()).map((key) => (
          <Signatory key={key} index={key} isOwnAccount={key === 0} onDelete={() => onDeleteSignatoryClick(key)} />
        ))}
      </div>
      <div>
        <Button
          size="sm"
          variant="text"
          className="mt-4 h-8.5 justify-center"
          suffixElement={<Icon name="add" size={16} />}
          onClick={onAddSignatoryClick}
        >
          {t('createMultisigAccount.addNewSignatory')}
        </Button>
      </div>
    </div>
  );
};
