import { BodyText, Button, TitleText } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import EmptyList from '@images/misc/empty-list.webp';

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
        <img src={EmptyList} alt="" width={178} height={178} />
        <TitleText className="mt-4">{t('staking.bond.noStakingAssetLabel')}</TitleText>
        <BodyText className="text-text-tertiary">{t('staking.bond.noStakingAssetDescription', { chainName })}</BodyText>
        <Button className="mt-7" onClick={onClose}>
          {t('staking.bond.goToStakingButton')}
        </Button>
      </div>
    </div>
  );
};
