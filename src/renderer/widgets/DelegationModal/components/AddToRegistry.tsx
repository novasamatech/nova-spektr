import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Alert, ButtonWebLink, FootnoteText } from '@/shared/ui';
import { NOVASAMA_DELEGATE_REGISTRY } from '../common/constants';
import { addToRegistryModel } from '../model/add-to-registry-model';

type Props = {
  className?: string;
};

export const AddToRegistry = ({ className }: Props) => {
  const { t } = useI18n();

  const isModalOpen = useUnit(addToRegistryModel.$isModalOpen);

  return (
    <Alert
      active={isModalOpen}
      title={t('governance.addDelegation.addToRegistry.title')}
      variant="info"
      wrapperClassName={className}
      onClose={() => addToRegistryModel.events.modalClosed()}
    >
      <FootnoteText>{t('governance.addDelegation.addToRegistry.message')}</FootnoteText>
      <ButtonWebLink
        size="sm"
        className="justify-start p-0"
        variant="text"
        href={NOVASAMA_DELEGATE_REGISTRY}
        target="_blank"
      >
        {t('governance.addDelegation.addToRegistry.link')}
      </ButtonWebLink>
    </Alert>
  );
};
