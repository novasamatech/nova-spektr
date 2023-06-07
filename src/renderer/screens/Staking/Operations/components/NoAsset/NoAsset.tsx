import { Icon } from '@renderer/components/ui';
import { TitleText, BodyText, Button } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  chainName: string;
  isOpen: boolean;
  onClose: () => void;
};

export const NoAsset = ({ chainName, onClose }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex w-full h-full flex-col items-center justify-center">
        <Icon as="img" name="emptyList" size={178} />
        <TitleText className="mt-4">{t('staking.bond.noStakingAssetLabel')}</TitleText>
        <BodyText className="text-text-tertiary">{t('staking.bond.noStakingAssetDescription', { chainName })}</BodyText>
        <Button className="mt-7" onClick={onClose}>
          {t('staking.bond.goToStakingButton')}
        </Button>
      </div>
    </div>
  );
};
