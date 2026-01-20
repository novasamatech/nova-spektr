import { useI18n } from '@/shared/i18n';
import { SearchInput } from '@/shared/ui-kit';

export const Search = () => {
  const { t } = useI18n();

  return <SearchInput placeholder={t('operations.searchPlaceholder')} />;
};
