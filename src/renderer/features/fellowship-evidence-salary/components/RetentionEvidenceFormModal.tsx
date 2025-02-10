/* eslint-disable i18next/no-literal-string */
import { type FormEventHandler, type PropsWithChildren, memo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, Markdown, Separator } from '@/shared/ui';
import { Box, Field, Modal, TextArea } from '@/shared/ui-kit';

type Props = PropsWithChildren;

export const RetentionEvidenceFormModal = memo(({ children }: Props) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [areas, setAreas] = useState('');
  const [evidence, setEvidence] = useState('');
  const [comments, setComments] = useState('');
  const [md, setMd] = useState('');

  const submit = () => {
    const md = `
# Areas of work
${areas}
# Evidence
${evidence}
# Comments
${comments}
    `;

    setMd(md);
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = e => {
    e.preventDefault();
    submit();
  };

  return (
    <Modal size="lg" height="lg" isOpen={open} onToggle={setOpen}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('fellowship.evidence.retentionEvidenceModalTitle')}</Modal.Title>
      <Modal.HeaderContent>
        <Box padding={[4, 5, 6]}>{t('fellowship.evidence.retentionEvidenceModalDescription')}</Box>
        <Separator />
      </Modal.HeaderContent>
      <Modal.Content>
        <form className="flex flex-grow flex-col" onSubmit={handleSubmit}>
          <Box padding={[4, 5]} gap={4}>
            <Field text="Areas of expertise and interest">
              <TextArea autosize name="areas" rows={1} placeholder="Enter areas" value={areas} onChange={setAreas} />
            </Field>
            <Field text="Evidence (document hash, url, etc.)">
              <TextArea
                autosize
                name="evidence"
                rows={3}
                placeholder="Enter more about the work you did, add links, and tell about your future work plans"
                value={evidence}
                onChange={setEvidence}
              />
            </Field>
            <Field text="Comments">
              <TextArea
                autosize
                name="comments"
                rows={3}
                placeholder="Enter comments about how your retention period went"
                value={comments}
                onChange={setComments}
              />
            </Field>
          </Box>
        </form>
        <Markdown>{md}</Markdown>
      </Modal.Content>
      <Modal.Footer>
        <Button variant="text" onClick={() => setOpen(false)}>
          {t('general.button.closeButton')}
        </Button>
        <Box grow={1} />
        <Button onClick={submit}>{t('general.button.submitButton')}</Button>
      </Modal.Footer>
    </Modal>
  );
});
