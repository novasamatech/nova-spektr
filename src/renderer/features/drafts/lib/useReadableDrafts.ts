import { useUnit } from 'effector-react';

import { type Draft, PERMISSIONS, useDrafts } from '@/domains/backend';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';
import { backendContactsModel } from '@/features/contacts';

export function useReadableDrafts(): { drafts: Draft[]; available: boolean } {
  const backendUrl = useUnit(backendConfigurationModel.$backendUrl);
  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const authState = useUnit(authModel.$authState);
  const isHealthy = useUnit(backendContactsModel.$isHealthy);

  const canRead = isAuthenticated && !!authState?.permissions.includes(PERMISSIONS.OPERATION_DRAFT_READ);
  const available = isHealthy && canRead;
  const { data: drafts } = useDrafts(available ? backendUrl : null);

  return { drafts, available };
}
