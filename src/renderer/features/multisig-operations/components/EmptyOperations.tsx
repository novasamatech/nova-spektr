import { useI18n } from '@/shared/i18n';
import { BodyText, Button, FootnoteText, TitleText } from '@/shared/ui';
import { Graphics } from '@/shared/ui-kit';
import { type TabFilter, operationsContextModel } from '../model/context';

type Props = {
  isEmptyFromFilters: boolean;
  tab: TabFilter;
};

export const EmptyOperations = ({ isEmptyFromFilters, tab }: Props) => {
  const { t } = useI18n();

  let titleKey = 'operations.noOperationsTitle';
  let descriptionKey = 'operations.noOperationsFilters';
  if (!isEmptyFromFilters && tab === 'pending') {
    titleKey = 'operations.pendingEmptyTitle';
    descriptionKey = 'operations.pendingEmptyDescription';
  } else if (!isEmptyFromFilters && tab === 'history') {
    titleKey = 'operations.historyEmptyTitle';
    descriptionKey = 'operations.historyEmptyDescription';
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-y-6">
      <Graphics name="emptyList" alt={t(titleKey)} size={178} />

      <div className="flex flex-col items-center gap-y-4">
        <TitleText>{t(titleKey)}</TitleText>

        <BodyText align="center" className="max-w-[560px] text-text-tertiary">
          {t(descriptionKey)}
        </BodyText>

        {isEmptyFromFilters && (
          <>
            <FootnoteText align="center" className="text-text-tertiary">
              {t('operations.emptyStateFiltersHint')}
            </FootnoteText>

            <Button variant="text" pallet="primary" onClick={() => operationsContextModel.resetFilters()}>
              {t('operations.clearSearchAndFilters')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
