import { Link } from 'react-router-dom';

import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { FootnoteText, Plate, BodyText } from '@renderer/components/ui-redesign';
import { HelpText } from '@renderer/components/ui-redesign/Typography';
import Paths from '@renderer/routes/paths';
import twMerge from '@renderer/shared/utils/twMerge';

export const MatrixAction = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-y-2">
      <FootnoteText className="text-text-tertiary">{t('settings.overview.smpLabel')}</FootnoteText>

      <Plate className="p-0">
        <Link
          to={Paths.MATRIX}
          className={twMerge(
            'w-full grid grid-flow-col grid-cols-[auto,1fr,auto] items-center gap-x-2 p-3 rounded-md',
            'transition hover:shadow-card-shadow focus:shadow-card-shadow',
          )}
        >
          <Icon className="text-icon-default row-span-2" name="matrix" size={36} />
          <BodyText>{t('settings.overview.matrixLabel')}</BodyText>
          <HelpText className="text-text-tertiary">{t('settings.overview.matrixLabel')}</HelpText>
          <Icon className="text-icon-default row-span-2" name="right" size={16} />
        </Link>
      </Plate>
    </div>
  );
};
