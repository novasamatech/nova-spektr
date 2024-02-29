import { useUnit } from 'effector-react';

import { HelpText, IconButton, FootnoteText, SmallTitleText, Icon } from '@shared/ui';
import { constructorModel } from '../model/constructor-model';
import { networkModel } from '@entities/network';
import { ChainIcon } from '@entities/chain';
import { accountUtils } from '@entities/wallet';
import { KeyType } from '@shared/core';
import { useI18n } from '@app/providers';

export const KeysList = () => {
  const { t } = useI18n();

  const keys = useUnit(constructorModel.$keys);
  const hasKeys = useUnit(constructorModel.$hasKeys);
  const chains = useUnit(networkModel.$chains);

  if (!hasKeys) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Icon name="document" size={64} className="text-icon-default mb-6" />
        <SmallTitleText>{t('dynamicDerivations.constructor.emptyListTitle')}</SmallTitleText>
        <FootnoteText className="text-text-tertiary mt-2">
          {t('dynamicDerivations.constructor.emptyListDescription')}
        </FootnoteText>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex gap-x-6 px-5 pb-2 sticky top-0 z-10 bg-white">
        <HelpText className="text-text-tertiary">{t('dynamicDerivations.constructor.listNetworkLabel')}</HelpText>
        <HelpText className="text-text-tertiary">{t('dynamicDerivations.constructor.listKeysLabel')}</HelpText>
      </div>
      <ul className="flex flex-col gap-y-2">
        {keys.map((key, index) => {
          const keyData = accountUtils.isAccountWithShards(key) ? key[0] : key;

          if (keyData.keyType === KeyType.MAIN) return;

          return (
            <li key={keyData.id || keyData.derivationPath} className="flex items-center gap-x-3 py-1.5 pl-2">
              <ChainIcon
                className="my-4.5 mx-6"
                src={chains[keyData.chainId].icon}
                name={chains[keyData.chainId].name}
              />
              <div className="flex-1 flex flex-col gap-y-1 py-1.5 overflow-hidden">
                <FootnoteText className="text-text-primary truncate">{keyData.name}</FootnoteText>
                <FootnoteText className="text-text-secondary truncate">
                  {accountUtils.getDerivationPath(key)}
                </FootnoteText>
              </div>
              <IconButton
                name="delete"
                className="shrink-0 w-max ml-2 mr-9 hover:text-text-negative focus:text-text-negative"
                onClick={() => constructorModel.events.keyRemoved(index)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
};
