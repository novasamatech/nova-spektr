import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Surface } from '@/shared/ui-kit';

type Props = {
  searchQuery: string;
  onClearSearch: () => void;
  hasActiveFilters?: boolean;
};

export const MembersEmptyState = ({ searchQuery, onClearSearch, hasActiveFilters }: Props) => {
  const { t } = useI18n();

  const isSearchOnly = searchQuery && !hasActiveFilters;
  const isFilterOnly = hasActiveFilters && !searchQuery;

  const title = t('fellowship.activityFeed.activityModal.no-results.title');
  const description = useMemo(() => {
    if (isSearchOnly) {
      return t('fellowship.activityFeed.activityModal.no-results.search', {
        query: searchQuery,
      });
    }
    if (isFilterOnly) {
      return t('fellowship.activityFeed.activityModal.no-results.filters');
    }
    return t('fellowship.activityFeed.activityModal.no-results.general');
  }, [isSearchOnly, isFilterOnly, searchQuery, t]);

  return (
    <Surface className="mx-5 flex h-[430px] flex-col items-center justify-center py-10">
      <div className="flex flex-col items-center gap-6">
        <Icon name="document" size={64} />

        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <SmallTitleText className="text-center text-text-primary">{title}</SmallTitleText>
            <FootnoteText className="text-center whitespace-pre-line text-text-tertiary">{description}</FootnoteText>
          </div>

          <Button size="sm" variant="fill" pallet="primary" onClick={onClearSearch}>
            {t('fellowship.activityFeed.activityModal.nothing-found.clear')}
          </Button>
        </div>
      </div>
    </Surface>
  );
};
