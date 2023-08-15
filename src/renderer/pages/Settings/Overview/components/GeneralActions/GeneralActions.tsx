import { Link } from 'react-router-dom';

import { Icon, BodyText, Plate, FootnoteText, HelpText } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { Paths } from '../../../../../app/providers/routes/paths';
import { cnTw } from '@renderer/shared/lib/utils';

// TODO: Language switcher temporary removed
export const GeneralActions = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-y-2">
      <FootnoteText className="text-text-tertiary">{t('settings.overview.generalLabel')}</FootnoteText>

      <Plate className="p-0">
        <Link
          to={Paths.NETWORK}
          className={cnTw(
            'w-full grid grid-flow-col grid-cols-[auto,1fr,auto] items-center gap-x-2 p-3 rounded-md',
            'transition hover:shadow-card-shadow focus:shadow-card-shadow',
          )}
        >
          <Icon className="row-span-2" name="networks" size={32} />
          <BodyText>{t('settings.overview.networkLabel')}</BodyText>
          <HelpText className="text-text-tertiary">{t('settings.overview.networkDetailsLabel')}</HelpText>
        </Link>
      </Plate>
    </div>
  );
};
