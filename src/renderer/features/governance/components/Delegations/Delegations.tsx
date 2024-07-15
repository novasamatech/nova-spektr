import { useI18n } from '@app/providers';
import { Icon, FootnoteText, Plate } from '@shared/ui';

export const Delegations = () => {
  const { t } = useI18n();

  return (
    <button onClick={() => console.log('Go to Delegate')}>
      <Plate className="w-[240px] h-[90px] pt-3 px-4 pb-4.5 flex justify-between items-center">
        <div className="flex flex-col gap-y-2">
          <div className="flex gap-x-1 items-center">
            <Icon name="opengovDelegations" />
            <FootnoteText>{t('governance.delegate')}</FootnoteText>
          </div>
          {/* {isLoading && <Shimmering width={120} height={20} />}
          {!isLoading && asset && <AssetBalance value={} asset={asset} />} */}
        </div>
        <Icon name="arrowRight" />
      </Plate>
    </button>
  );
};
