import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { IconButton } from '@/shared/ui';
import { Tooltip, useNotification } from '@/shared/ui-kit';
import { hideUnnamedWalletsModel } from '../model/model';

export const HideUnnamedWalletsButton = () => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const mode = useUnit(hideUnnamedWalletsModel.$mode);

  if (mode === 'none') return null;

  const isHideMode = mode === 'hide';

  const handleClick = async () => {
    if (isHideMode) {
      const wallets = await hideUnnamedWalletsModel.hideAll();
      if (wallets.length === 0) return;
      toast.success(t('features.hide-unnamed-wallets.hiddenToast'));
    } else {
      const wallets = await hideUnnamedWalletsModel.unhideAll();
      if (wallets.length === 0) return;
      toast.success(t('features.hide-unnamed-wallets.restoredToast'));
    }
  };

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <IconButton name={isHideMode ? 'eye' : 'eyeSlashed'} onClick={handleClick} />
      </Tooltip.Trigger>
      <Tooltip.Content>
        {isHideMode ? t('features.hide-unnamed-wallets.hideTooltip') : t('features.hide-unnamed-wallets.unhideTooltip')}
      </Tooltip.Content>
    </Tooltip>
  );
};
