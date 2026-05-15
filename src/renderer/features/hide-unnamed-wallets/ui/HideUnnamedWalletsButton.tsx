import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { IconButton } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { hideUnnamedWalletsModel } from '../model/model';

export const HideUnnamedWalletsButton = () => {
  const { t } = useI18n();
  const mode = useUnit(hideUnnamedWalletsModel.$mode);

  if (mode === 'none') return null;

  const isHideMode = mode === 'hide';

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <IconButton
          name={isHideMode ? 'eye' : 'eyeSlashed'}
          onClick={() => (isHideMode ? hideUnnamedWalletsModel.hideAll() : hideUnnamedWalletsModel.unhideAll())}
        />
      </Tooltip.Trigger>
      <Tooltip.Content>
        {isHideMode ? t('features.hide-unnamed-wallets.hideTooltip') : t('features.hide-unnamed-wallets.unhideTooltip')}
      </Tooltip.Content>
    </Tooltip>
  );
};
