import { PropsWithChildren } from 'react';

import { Button, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import TransactionInfo, { InfoProps } from '../TransactionInfo/TransactionInfo';

interface Props extends InfoProps {
  onResult: () => void;
  onAddToQueue: () => void;
}

export const Confirmation = ({ children, onResult, onAddToQueue, ...props }: PropsWithChildren<Props>) => {
  const { t } = useI18n();

  return (
    <TransactionInfo {...props}>
      <div className="flex flex-col gap-y-4 mt-4">
        {children}

        <div className="flex flex-col items-center gap-y-2.5">
          <Button
            variant="fill"
            pallet="primary"
            weight="lg"
            suffixElement={<Icon name="qrLine" size={20} />}
            onClick={onResult}
          >
            {t('staking.confirmation.signButton')}
          </Button>

          {/* TODO: uncomment after adding Queue */}
          {/*<Button*/}
          {/*  className="hidden"*/}
          {/*  variant="outline"*/}
          {/*  pallet="primary"*/}
          {/*  weight="lg"*/}
          {/*  suffixElement={<Icon name="addLine" size={20} />}*/}
          {/*  onClick={onAddToQueue}*/}
          {/*>*/}
          {/*  {t('staking.confirmation.queueButton')}*/}
          {/*</Button>*/}
        </div>
      </div>
    </TransactionInfo>
  );
};
