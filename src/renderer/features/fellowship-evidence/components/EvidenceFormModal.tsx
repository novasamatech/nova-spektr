import { useForm } from 'effector-forms';
import { useGate, useUnit } from 'effector-react';
import { type FormEventHandler, type PropsWithChildren, memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Alert, Button, InputHint, Separator } from '@/shared/ui';
import { Box, Field, Modal, TextArea } from '@/shared/ui-kit';
import { evidenceForm } from '../model/evidenceForm';

type Props = PropsWithChildren<{
  wish: 'Promotion' | 'Retention';
  isOpen: boolean;
  onToggle(open: boolean): void;
}>;

export const EvidenceFormModal = memo(({ isOpen, wish, children, onToggle }: Props) => {
  useGate(evidenceForm.flow, { wish });

  const { t } = useI18n();
  const { fields, submit } = useForm(evidenceForm.form);
  const uploadError = useUnit(evidenceForm.$uploadError);
  const pending = useUnit(evidenceForm.post.pending);

  const title =
    wish === 'Retention'
      ? t('fellowship.salary.retentionEvidenceModalTitle')
      : t('fellowship.salary.promotionEvidenceModalTitle');

  const handleSubmit: FormEventHandler<HTMLFormElement> = e => {
    e.preventDefault();
    submit();
  };

  return (
    <Modal size="lg" height="lg" isOpen={isOpen} onToggle={onToggle}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{title}</Modal.Title>
      <Modal.HeaderContent>
        <Box padding={[4, 8, 6, 5]}>{t('fellowship.salary.retentionEvidenceModalDescription')}</Box>
        <Separator />
      </Modal.HeaderContent>
      <Modal.Content>
        <form className="flex grow flex-col" onSubmit={handleSubmit}>
          <Box padding={[4, 5]} gap={4}>
            <Alert active={!!uploadError} variant="error" title={t('fellowship.salary.evidenceForm.uploadError')}>
              <Alert.Item withDot={false}>{uploadError}</Alert.Item>
            </Alert>
            <Field text={t('fellowship.salary.evidenceForm.areas.label')}>
              <TextArea
                autosize
                name="areas"
                rows={1}
                placeholder={t('fellowship.salary.evidenceForm.areas.placeholder')}
                value={fields.areas.value}
                onChange={fields.areas.onChange}
              />
              <InputHint variant="error" active={fields.areas.hasError()}>
                {t(fields.areas.errorText())}
              </InputHint>
            </Field>
            <Field text={t('fellowship.salary.evidenceForm.evidence.label')}>
              <TextArea
                autosize
                name="evidence"
                rows={3}
                placeholder={t('fellowship.salary.evidenceForm.evidence.placeholder')}
                value={fields.evidence.value}
                onChange={fields.evidence.onChange}
              />
              <InputHint variant="error" active={fields.evidence.hasError()}>
                {t(fields.evidence.errorText())}
              </InputHint>
            </Field>
            <Field text={t('fellowship.salary.evidenceForm.comments.label')}>
              <TextArea
                autosize
                name="comments"
                rows={3}
                placeholder={t('fellowship.salary.evidenceForm.comments.placeholder')}
                value={fields.comments.value}
                onChange={fields.comments.onChange}
              />
              <InputHint variant="error" active={fields.comments.hasError()}>
                {t(fields.comments.errorText())}
              </InputHint>
            </Field>
          </Box>
        </form>
      </Modal.Content>
      <Modal.Footer>
        <Button variant="text" onClick={() => onToggle(false)}>
          {t('general.button.closeButton')}
        </Button>
        <Box grow={1} />
        <Button isLoading={pending} disabled={pending} onClick={() => submit()}>
          {t('general.button.submitButton')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
});
