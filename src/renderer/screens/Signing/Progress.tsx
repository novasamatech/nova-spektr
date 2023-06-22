import cn from 'classnames';

import { useI18n } from '@renderer/context/I18nContext';
import { Loader } from '@renderer/components/ui';

type Props = {
  progress: number;
  max: number;
};

const Progress = ({ progress, max }: Props) => {
  const { t } = useI18n();

  return (
    <>
      {progress !== max && (
        <div className="mt-8 text-neutral-variant font-semibold flex items-center gap-3 w-fit m-auto">
          <Loader size={15} color="primary" />
          {t('transfer.multiple.executing')}
        </div>
      )}
      <div className="flex text-2xs items-center gap-1 mt-3 bg-white rounded-lg pr-1">
        <div className={cn('rounded-lg px-1.5 py-1 text-text-white', progress === max ? 'bg-success' : 'bg-shade-30')}>
          {progress} {'/'} <span className="text-text-white opacity-75">{max}</span>
        </div>

        {t('transfer.multiple.transactions')}
      </div>
    </>
  );
};

export default Progress;
