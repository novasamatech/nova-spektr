import { useUnit } from 'effector-react';
import noop from 'lodash/noop';

import { useI18n } from '@app/providers';
import { StatusModal } from '@shared/ui';
import { Animation } from '@shared/ui/Animation/Animation';
import { matrixModel, matrixUtils } from '@entities/matrix';
import { matrixAutologinModel } from '../model/matrix-autologin-model';
import { matrixAutologinUtils } from '../lib/matrix-autologin-utils';
import { type AutoLoginStatus } from '../lib/types';

export const MatrixAutoLogin = () => {
  const { t } = useI18n();

  const loginStatus = useUnit(matrixModel.$loginStatus);
  const autoLoginStatus = useUnit(matrixAutologinModel.$autoLoginStatus);

  const getAnimationParams = (status: AutoLoginStatus) => {
    if (matrixAutologinUtils.isError(status)) {
      return { variant: 'error', loop: false } as const;
    }
    if (matrixAutologinUtils.isSuccess(status)) {
      return { variant: 'success', loop: false } as const;
    }

    return { variant: 'loading', loop: true } as const;
  };

  if (!matrixUtils.isAutoLogin(loginStatus)) return null;

  return (
    <StatusModal
      isOpen={!matrixAutologinUtils.isNone(autoLoginStatus)}
      title={t('settings.matrix.autoLoginTitle')}
      zIndex="z-60"
      content={<Animation {...getAnimationParams(autoLoginStatus)} />}
      onClose={noop}
    />
  );
};
