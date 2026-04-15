import { type FormEvent, type PropsWithChildren, useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Input, Modal } from '@/shared/ui-kit';
import { type OperationTemplate, useTemplateMutations } from '@/domains/operation-templates';

type Props = PropsWithChildren<{
  template: OperationTemplate;
}>;

export const RenameTemplateModal = ({ template, children }: Props) => {
  const { t } = useI18n();
  const { rename } = useTemplateMutations();

  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(template.name);

  useEffect(() => {
    if (isOpen) {
      setValue(template.name);
    }
  }, [isOpen, template.name]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed === template.name) {
      setIsOpen(false);
      return;
    }
    await rename(template, trimmed);
    setIsOpen(false);
  };

  return (
    <Modal size="md" height="fit" isOpen={isOpen} onToggle={setIsOpen}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('operationTemplates.renameTitle')}</Modal.Title>
      <Modal.Content>
        <form className="flex flex-col gap-4 p-4" onSubmit={submit}>
          <Input autoFocus value={value} placeholder={t('operationTemplates.renameTitle')} onChange={setValue} />
          <Button className="ml-auto" size="sm" type="submit" disabled={value.trim() === ''}>
            {t('operationTemplates.renameSave')}
          </Button>
        </form>
      </Modal.Content>
    </Modal>
  );
};
