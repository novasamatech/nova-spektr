import { createFeature } from '@/shared/feature';
import { extrinsicBuilderToolbarSlot } from '@/features/call-data-execute';
import { OperationTemplatesToolbar } from '../ui/OperationTemplatesToolbar';

export const operationTemplatesFeature = createFeature({
  name: 'operation-templates/main',
});

operationTemplatesFeature.inject(extrinsicBuilderToolbarSlot, {
  order: 0,
  render: OperationTemplatesToolbar,
});
