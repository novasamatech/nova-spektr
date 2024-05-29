import { Button } from '@shared/ui';
import { Wallet } from '@shared/core';
import { basketUtils } from '../lib/basket-utils';
import { useI18n } from '@app/providers';

type Props = {
  wallet?: Wallet;
  onTxSaved: () => void;
};

export const AddToBasketButton = ({ wallet, onTxSaved }: Props) => {
  const { t } = useI18n();

  if (wallet && !basketUtils.isBasketAvailable(wallet)) return null;

  return (
    <Button pallet="secondary" onClick={onTxSaved}>
      {t('operation.addToBasket')}
    </Button>
  );
};
