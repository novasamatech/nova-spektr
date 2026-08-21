import { useUnit } from 'effector-react';

import { type Draft, useDrafts } from '@/domains/backend';
import { backendConfigurationModel } from '@/aggregates/backend';
import { backendContactsModel } from '@/features/contacts';

import { useCanReadDrafts } from './useCanReadDrafts';

export function useReadableDrafts(): { drafts: Draft[]; available: boolean } {
  const backendUrl = useUnit(backendConfigurationModel.$backendUrl);
  const isHealthy = useUnit(backendContactsModel.$isHealthy);
  const canRead = useCanReadDrafts();

  const available = isHealthy && canRead;
  const { data: drafts } = useDrafts(available ? backendUrl : null);

  return { drafts, available };
}
