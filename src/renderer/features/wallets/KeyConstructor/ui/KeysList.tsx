import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { HelpText, IconButton, FootnoteText, SmallTitleText, Icon } from '@shared/ui';
import { constructorModel } from '../model/constructor-model';
import { chainsService } from '@entities/network';
import { dictionary } from '@shared/lib/utils';
import { ChainIcon } from '@entities/chain';
import { accountUtils } from '@entities/wallet';
import { KeyType } from '@shared/core';
import { useI18n } from '@app/providers';

export const KeysList = () => {
  const { t } = useI18n();

  const keys = useUnit(constructorModel.$keys);

  const filteredKeys = keys.filter((key) => {
    const keyData = Array.isArray(key) ? key[0] : key;

    return keyData.keyType !== KeyType.MAIN;
  });

  const chains = useMemo(() => {
    return dictionary(chainsService.getChainsData(), 'chainId');
  }, []);

  if (filteredKeys.length === 0) {
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
        {filteredKeys.map((key, index) => {
          const keyData = Array.isArray(key) ? key[0] : key;

          return (
            <li key={keyData.id || keyData.derivationPath} className="flex items-center gap-x-2.5 py-1.5 pl-2">
              <ChainIcon
                className="my-4.5 mx-6"
                src={chains[keyData.chainId].icon}
                name={chains[keyData.chainId].name}
              />
              <div className="flex flex-col gap-y-1 py-1.5">
                <FootnoteText className="text-text-primary">{keyData.name}</FootnoteText>
                <FootnoteText className="text-text-secondary">{accountUtils.getDerivationPath(key)}</FootnoteText>
              </div>
              <IconButton
                name="delete"
                className="shrink-0 w-max ml-auto mr-8 hover:text-text-negative focus:text-text-negative"
                onClick={() => constructorModel.events.keyRemoved(index)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
};
