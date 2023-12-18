import { useUnit } from 'effector-react';

import { SmallTitleText, Button, Icon } from '@shared/ui';
import { useI18n } from '@app/providers';
import { shardsModel } from '../model/shards-model';

export const ShardSelectorButton = () => {
  const { t } = useI18n();

  const isAccessDenied = useUnit(shardsModel.$isAccessDenied);
  const totalSelected = useUnit(shardsModel.$totalSelected);

  if (isAccessDenied) return null;

  return (
    <div className="w-[546px] mx-auto flex items-center mt-4">
      <SmallTitleText as="h3">{t('balances.shardsTitle')} </SmallTitleText>
      <Button
        variant="text"
        suffixElement={<Icon name="edit" size={16} className="text-icon-accent" />}
        className="outline-offset-reduced"
        onClick={() => shardsModel.events.modalToggled()}
      >
        {totalSelected} {t('balances.shards')}
      </Button>
    </div>
  );
};
