import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { IconButton } from '@/shared/ui';
import { Tooltip, useNotification } from '@/shared/ui-kit';
import { hideUnnamedWalletsModel } from '../model/model';

export const HideUnnamedWalletsButton = () => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const { mode, displayMode, isUpdating } = useUnit({
    mode: hideUnnamedWalletsModel.$mode,
    displayMode: hideUnnamedWalletsModel.$displayMode,
    isUpdating: hideUnnamedWalletsModel.$isUpdating,
  });

  if (mode === 'none') return null;

  const isHideMode = mode === 'hide';
  const displayHideMode = displayMode === 'hide';

  const handleClick = async () => {
    if (isUpdating) return;

    const wallets = isHideMode ? await hideUnnamedWalletsModel.hideAll() : await hideUnnamedWalletsModel.unhideAll();
    if (wallets.length === 0) return;

    toast.success(
      isHideMode ? t('features.hide-unnamed-wallets.hiddenToast') : t('features.hide-unnamed-wallets.restoredToast'),
    );
  };

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <IconButton name={displayHideMode ? 'eye' : 'eyeSlashed'} disabled={isUpdating} onClick={handleClick} />
      </Tooltip.Trigger>
      <Tooltip.Content>
        {displayHideMode
          ? t('features.hide-unnamed-wallets.hideTooltip')
          : t('features.hide-unnamed-wallets.unhideTooltip')}
      </Tooltip.Content>
    </Tooltip>
  );
};
