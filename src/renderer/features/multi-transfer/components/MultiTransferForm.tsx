import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Box, Modal, ScrollArea } from '@/shared/ui-kit';
import { formModel } from '../model/form';

import { UploadCSV } from './MultiTransferUpload';
import { NetworkSelect } from './NetworkSelect';

type Props = {
  formId: string;
};

export const MultiTransferForm = ({ formId }: Props) => {
  const { t } = useI18n();
  const { submit } = useForm(formModel.form);
  // const chain = fields.chain;
  // const availableChains = useUnit(formModel.$availableChains);

  const parsedCsv = useUnit(formModel.$parsedCsv);
  const csvError = useUnit(formModel.$csvError);
  const canSubmit = !!parsedCsv?.length && nullable(csvError);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <>
      <ScrollArea>
        <form id={formId} onSubmit={handleSubmit}>
          <Box padding={[4, 5]} gap={4}>
            <NetworkSelect />
            <UploadCSV />
          </Box>
        </form>
      </ScrollArea>

      <Modal.Footer>
        <Button form={formId} type="submit" disabled={!canSubmit}>
          {t('transfer.continueButton')}
        </Button>
      </Modal.Footer>
    </>
  );
};
