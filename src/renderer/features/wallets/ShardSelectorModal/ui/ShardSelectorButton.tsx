import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, Icon, SmallTitleText } from '@/shared/ui';
import { shardsModel } from '../model/shards-model';

export const ShardSelectorButton = () => {
  const { t } = useI18n();

  const isAccessDenied = useUnit(shardsModel.$isAccessDenied);
  const totalSelected = useUnit(shardsModel.$totalSelected);

  useEffect(() => {
    shardsModel.events.structureRequested(true);

    return () => {
      shardsModel.events.structureRequested(false);
    };
  }, []);

  if (isAccessDenied) {
    return null;
  }

  return (
    <div className="mx-auto mt-4 flex w-[736px] items-center">
      <SmallTitleText as="h3">{t('balances.assetsOnLabel')} </SmallTitleText>
      <Button
        variant="text"
        suffixElement={<Icon name="edit" size={16} className="text-icon-accent" />}
        className="outline-offset-reduced"
        onClick={() => shardsModel.events.modalToggled()}
      >
        {t('balances.selectedAccounts', { amount: totalSelected })}
      </Button>
    </div>
  );
};
