import { useUnit } from 'effector-react';

import { PERMISSIONS } from '@/domains/backend';
import { authModel } from '@/aggregates/backend';

export const useCanReadDrafts = () => {
  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const authState = useUnit(authModel.$authState);

  return isAuthenticated && (authState?.permissions.includes(PERMISSIONS.OPERATION_DRAFT_READ) ?? false);
};
