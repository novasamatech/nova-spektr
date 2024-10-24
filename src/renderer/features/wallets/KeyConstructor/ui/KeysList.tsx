import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, HelpText, Icon, IconButton, SmallTitleText } from '@/shared/ui';
import { ChainIcon } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { constructorModel } from '../model/constructor-model';

export const KeysList = () => {
  const { t } = useI18n();

  const keys = useUnit(constructorModel.$keys);
  const hasKeys = useUnit(constructorModel.$hasKeys);
  const chains = useUnit(networkModel.$chains);

  if (!hasKeys) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <Icon name="document" size={64} className="mb-6 text-icon-default" />
        <SmallTitleText>{t('dynamicDerivations.constructor.emptyListTitle')}</SmallTitleText>
        <FootnoteText className="mt-2 text-text-tertiary">
          {t('dynamicDerivations.constructor.emptyListDescription')}
        </FootnoteText>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="sticky top-0 z-10 flex gap-x-6 bg-white px-5 pb-2">
        <HelpText className="text-text-tertiary">{t('dynamicDerivations.constructor.listNetworkLabel')}</HelpText>
        <HelpText className="text-text-tertiary">{t('dynamicDerivations.constructor.listKeysLabel')}</HelpText>
      </div>
      <ul className="flex flex-col gap-y-2">
        {keys.map((key, index) => {
          const keyData = accountUtils.isAccountWithShards(key) ? key[0] : key;

          if (!chains[keyData.chainId]) return;

          return (
            <li key={keyData.id || keyData.derivationPath} className="flex items-center gap-x-3 py-1.5 pl-2">
              <ChainIcon
                className="mx-6 my-4.5"
                src={chains[keyData.chainId].icon}
                name={chains[keyData.chainId].name}
              />
              <div className="flex flex-1 flex-col gap-y-1 overflow-hidden py-1.5">
                <FootnoteText className="truncate text-text-primary">{keyData.name}</FootnoteText>
                <FootnoteText className="truncate text-text-secondary">
                  {accountUtils.getDerivationPath(key)}
                </FootnoteText>
              </div>
              <IconButton
                name="delete"
                className="ml-2 mr-9 w-max shrink-0 hover:text-text-negative focus:text-text-negative"
                onClick={() => constructorModel.events.keyRemoved(index)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
};
