import { useI18n } from '@/shared/i18n';
import { BodyText, Button, FootnoteText, Icon } from '@/shared/ui';

export const NoSelection = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <FootnoteText className="text-text-tertiary">{t('dashboard.accountsTable.noSelection')}</FootnoteText>
    </div>
  );
};

type EmptyFilteredProps = {
  onClearFilters: () => void;
};

export const EmptyFiltered = ({ onClearFilters }: EmptyFilteredProps) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-y-3 px-4 py-10">
      <Icon name="noResults" size={64} />

      <BodyText className="font-semibold">{t('dashboard.accountsTable.empty.title')}</BodyText>

      <FootnoteText className="max-w-80 text-center text-text-tertiary">
        {t('dashboard.accountsTable.empty.description')}
      </FootnoteText>

      <Button variant="fill" pallet="secondary" size="sm" onClick={onClearFilters}>
        {t('dashboard.accountsTable.empty.clearFilters')}
      </Button>
    </div>
  );
};
