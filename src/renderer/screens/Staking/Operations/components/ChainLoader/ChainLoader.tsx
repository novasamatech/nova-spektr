import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  chainName: string;
};

export const ChainLoader = ({ chainName }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-x-2">
        <Icon className="animate-spin text-shade-40" name="loader" size={50} />
        <p className="text-shade-40 text-2xl font-bold">{t('staking.loadingMessage', { chainName })}</p>
      </div>
    </div>
  );
};
