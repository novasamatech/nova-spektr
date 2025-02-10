/* eslint-disable i18next/no-literal-string */
import { type FormEventHandler, type PropsWithChildren, memo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, Separator } from '@/shared/ui';
import { Box, Field, Input, Modal, TextArea } from '@/shared/ui-kit';

type Props = PropsWithChildren;

export const RetentionEvidenceFormModal = memo(({ children }: Props) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const handleSubmit: FormEventHandler<HTMLFormElement> = e => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // eslint-disable-next-line no-restricted-syntax
    formData.forEach((value, key) => {
      console.log(key, ':', value);
    });
  };

  return (
    <Modal size="lg" height="lg" isOpen={open} onToggle={setOpen}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('fellowship.evidence.retentionEvidenceModalTitle')}</Modal.Title>
      <Modal.HeaderContent>
        <Box padding={[4, 5, 6]}>{t('fellowship.evidence.retentionEvidenceModalDescription')}</Box>
        <Separator />
      </Modal.HeaderContent>
      <form className="flex flex-grow flex-col" onSubmit={handleSubmit}>
        <Modal.Content>
          <Box padding={[4, 5]} gap={4}>
            <Field text="Areas of expertise and interest">
              <Input name="areas" height="md" placeholder="Enter areas" />
            </Field>
            <Field text="Evidence (document hash, url, etc.)">
              <TextArea
                autosize
                name="evidence"
                rows={3}
                placeholder="Enter more about the work you did, add links, and tell about your future work plans"
              />
            </Field>
            <Field text="Comments">
              <TextArea
                autosize
                name="comments"
                rows={10}
                placeholder="Enter comments about how your retention period went"
              />
            </Field>
          </Box>
        </Modal.Content>
        <Modal.Footer>
          <Button variant="text" onClick={() => setOpen(false)}>
            {t('general.button.closeButton')}
          </Button>
          <Box grow={1} />
          <Button type="submit">{t('general.button.submitButton')}</Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
});
