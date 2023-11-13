import { Switch, IconButton, MenuPopover, SearchInput } from '@shared/ui';
import { useI18n } from '@app/providers';

type Props = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  hideZeroBalances: boolean;
  onZeroBalancesChange: (value: boolean) => void;
};

export const AssetsFilters = ({ searchQuery, onSearchChange, hideZeroBalances, onZeroBalancesChange }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-x-3">
      <SearchInput
        value={searchQuery}
        placeholder={t('balances.searchPlaceholder')}
        className="w-[230px]"
        onChange={onSearchChange}
      />
      <MenuPopover
        className="w-[182px] px-4"
        position="top-full right-0"
        buttonClassName="rounded-full"
        offsetPx={0}
        content={
          <Switch checked={hideZeroBalances} labelPosition="right" className="gap-x-2" onChange={onZeroBalancesChange}>
            {t('balances.hideZeroBalancesLabel')}
          </Switch>
        }
      >
        <div className="relative">
          <IconButton name="settingsLite" className="p-1.5" />
          {hideZeroBalances && <span className="absolute rounded-full w-1.5 h-1.5 right-0 top-0 bg-icon-accent" />}
        </div>
      </MenuPopover>
    </div>
  );
};
