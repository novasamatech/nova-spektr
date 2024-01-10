import { Link } from 'react-router-dom';

import { Icon, FootnoteText, Plate, BodyText, StatusLabel, HelpText } from '@shared/ui';
import { useI18n, useMatrix } from '@app/providers';
import { Paths } from '@shared/routes';
import { cnTw } from '@shared/lib/utils';

export const MatrixAction = () => {
  const { t } = useI18n();
  const { matrix, isLoggedIn } = useMatrix();

  return (
    <div className="flex flex-col gap-y-2">
      <FootnoteText className="text-text-tertiary">{t('settings.overview.smpLabel')}</FootnoteText>

      <Plate className="p-0">
        <Link
          to={Paths.MATRIX}
          className={cnTw(
            'w-full grid grid-flow-col grid-cols-[auto,1fr,auto] items-center gap-x-2 p-3 rounded-md',
            'transition hover:shadow-card-shadow focus:shadow-card-shadow',
          )}
        >
          <Icon className="row-span-2" name="matrix" size={36} />
          <BodyText>{t('settings.overview.matrixLabel')}</BodyText>
          <HelpText className="text-text-tertiary">{t('settings.overview.matrixDescription')}</HelpText>

          {isLoggedIn ? (
            <StatusLabel
              className="row-span-2"
              variant="success"
              title={matrix.userId || ''}
              subtitle={
                matrix.sessionIsVerified
                  ? t('settings.overview.matrixStatusVerified')
                  : t('settings.overview.matrixStatusNotVerified')
              }
            />
          ) : (
            <StatusLabel className="row-span-2" title={t('settings.overview.matrixStatusLogin')} variant="waiting" />
          )}
        </Link>
      </Plate>
    </div>
  );
};
