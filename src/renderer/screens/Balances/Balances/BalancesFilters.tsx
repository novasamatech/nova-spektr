import { Icon, Switch } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { IconButton, Input, MenuPopover } from '@renderer/components/ui-redesign';

type Props = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  hideZeroBalances: boolean;
  onZeroBalancesChange: (value: boolean) => void;
};
const BalancesFilters = ({ searchQuery, onSearchChange, hideZeroBalances, onZeroBalancesChange }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-x-3">
      <Input
        prefixElement={<Icon name="search" size={16} className="absolute top-[9px] left-3" />}
        value={searchQuery}
        placeholder={t('balances.searchPlaceholder')}
        className="w-[230px] pl-9"
        onChange={onSearchChange}
      />
      <MenuPopover
        className="w-[176px] px-4"
        position="top-full right-0"
        offsetPx={4}
        content={
          <Switch checked={hideZeroBalances} labelPosition="right" onChange={onZeroBalancesChange}>
            {t('balances.hideZeroBalancesLabel')}
          </Switch>
        }
      >
        <IconButton name="settingsLite" />
      </MenuPopover>
    </div>
  );
};

export default BalancesFilters;
