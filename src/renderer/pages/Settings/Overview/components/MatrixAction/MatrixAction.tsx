import { useUnit } from 'effector-react';
import { Link } from 'react-router-dom';

import { useI18n } from '@app/providers';

import { cnTw } from '@shared/lib/utils';
import { Paths } from '@shared/routes';
import { BodyText, FootnoteText, HelpText, Icon, Plate, StatusLabel } from '@shared/ui';

import { matrixModel, matrixUtils } from '@entities/matrix';

export const MatrixAction = () => {
  const { t } = useI18n();

  const matrix = useUnit(matrixModel.$matrix);
  const loginStatus = useUnit(matrixModel.$loginStatus);

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

          {matrixUtils.isLoggedIn(loginStatus) ? (
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
