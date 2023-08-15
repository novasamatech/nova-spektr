import { BodyText } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import EmptyList from '@renderer/assets/images/misc/empty-list.webp';

export const EmptyFilteredContacts = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full">
      <img src={EmptyList} alt={t('addressBook.contactList.emptySearchLabel')} width={178} height={178} />
      <BodyText className="text-text-tertiary">{t('addressBook.contactList.emptySearchLabel')}</BodyText>
    </div>
  );
};
