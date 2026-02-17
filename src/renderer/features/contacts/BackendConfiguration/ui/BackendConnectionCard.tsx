import { useUnit } from 'effector-react';

import { FootnoteText, Icon, IconButton } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { backendConfigurationModel } from '../model/backend-configuration-model';

export const BackendConnectionCard = () => {
  const [hasBackend, backendUrl] = useUnit([
    backendConfigurationModel.$hasBackend,
    backendConfigurationModel.$backendUrl,
  ]);

  if (!hasBackend) return null;

  return (
    <div className="flex h-full items-center gap-x-1 rounded-md border border-filter-border bg-input-background px-2.5">
      <Icon name="globe" size={16} className="shrink-0 text-icon-accent" />
      <Tooltip enableHover delay={200}>
        <Tooltip.Trigger>
          <FootnoteText className="max-w-[140px] truncate">{backendUrl}</FootnoteText>
        </Tooltip.Trigger>
        <Tooltip.Content>{backendUrl}</Tooltip.Content>
      </Tooltip>
      <div className="ml-auto flex items-center">
        <IconButton
          className="shrink-0 text-icon-default"
          name="edit"
          size={14}
          onClick={() => backendConfigurationModel.events.editStarted()}
        />
        <IconButton
          className="shrink-0 text-icon-default"
          name="delete"
          size={14}
          onClick={() => backendConfigurationModel.events.urlCleared()}
        />
      </div>
    </div>
  );
};
