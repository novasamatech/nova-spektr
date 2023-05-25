import { useI18n } from '@renderer/context/I18nContext';
import { SmallTitleText } from '@renderer/components/ui-redesign';

type Props = {
  test?: string;
};

const Actions = ({ test }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-x-4">
      <SmallTitleText>{t('staking.overview.actionsTitle')}</SmallTitleText>
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <div>Filter</div>
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <div>Button</div>
    </div>
  );
};

export default Actions;
