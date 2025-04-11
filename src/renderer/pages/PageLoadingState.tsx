import { Loader } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';

export const PageLoadingState = () => {
  return (
    <Box width="100%" height="100%" horizontalAlign="center" verticalAlign="center" padding={6}>
      <Loader color="primary" size={32} />
    </Box>
  );
};
