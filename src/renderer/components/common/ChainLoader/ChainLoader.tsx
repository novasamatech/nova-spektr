import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { TitleText } from '@renderer/components/ui-redesign';

type Props = {
  chainName: string;
};

const ChainLoader = ({ chainName }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-x-2">
        <Icon className="animate-spin text-shade-40" name="loader" size={25} />
        <TitleText className="text-text-tertiary">{t('staking.loadingMessage', { chainName })}</TitleText>
      </div>
    </div>
  );
};

export default ChainLoader;
