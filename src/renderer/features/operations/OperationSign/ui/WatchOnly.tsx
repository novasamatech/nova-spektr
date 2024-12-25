import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { type SigningProps } from '../lib/types';

export const WatchOnly = ({ onGoBack }: SigningProps) => {
  const { t } = useI18n();

  return (
    <>
      <Box padding={4}>{t('operation.errorWatchOnly')}</Box>
      <Modal.Footer>
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>
      </Modal.Footer>
    </>
  );
};
