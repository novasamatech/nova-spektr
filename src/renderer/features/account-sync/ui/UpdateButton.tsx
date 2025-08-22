import { useUnit } from 'effector-react';
import { memo } from 'react';

import { IconButton, Loader } from '@/shared/ui';
import { Box, Tooltip } from '@/shared/ui-kit';
import { sync } from '../model/sync';

export const UpdateButton = memo(() => {
  const pendingSync = useUnit(sync.syncAccounts.pending);

  return pendingSync ? (
    <Tooltip>
      <Tooltip.Trigger>
        <Box verticalAlign="center" horizontalAlign="center" height={8.5} width={8.5}>
          <Loader color="primary" />
        </Box>
      </Tooltip.Trigger>
      <Tooltip.Content>Syncing accounts...</Tooltip.Content>
    </Tooltip>
  ) : (
    <Tooltip>
      <Tooltip.Trigger>
        <IconButton name="refresh" onClick={() => sync.syncAccounts()} />
      </Tooltip.Trigger>
      <Tooltip.Content>Sync accounts</Tooltip.Content>
    </Tooltip>
  );
});
