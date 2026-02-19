import { useUnit } from 'effector-react';

import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { authModel } from '../model/auth-model';
import { backendConfigurationModel } from '../model/backend-configuration-model';

import { AuthStatus } from './AuthStatus';

export const BackendConnectionCard = () => {
  const [hasBackend, backendUrl, isAuthenticated] = useUnit([
    backendConfigurationModel.$hasBackend,
    backendConfigurationModel.$backendUrl,
    authModel.$isAuthenticated,
  ]);

  if (!hasBackend) return null;

  return (
    <button
      type="button"
      className="flex h-full cursor-pointer items-center gap-x-1 rounded-md border border-filter-border bg-input-background px-2.5 hover:bg-hover"
      onClick={() => backendConfigurationModel.events.editStarted()}
    >
      <Icon
        name="globe"
        size={16}
        className={cnTw('shrink-0', isAuthenticated ? 'text-icon-positive' : 'text-icon-accent')}
      />
      <Tooltip enableHover delay={200}>
        <Tooltip.Trigger>
          <FootnoteText className="max-w-[140px] truncate">{backendUrl}</FootnoteText>
        </Tooltip.Trigger>
        <Tooltip.Content>{backendUrl}</Tooltip.Content>
      </Tooltip>
      <AuthStatus />
    </button>
  );
};
