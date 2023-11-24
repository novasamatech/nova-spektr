import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { HelpText, IconButton, FootnoteText, SmallTitleText, Icon } from '@shared/ui';
import { constructorModel } from '../model/constructor-model';
import { chainsService } from '@entities/network';
import { dictionary } from '@shared/lib/utils';
import { ChainIcon } from '@entities/chain';
import { accountUtils } from '@entities/wallet';
import { KeyType } from '@shared/core';

export const KeysList = () => {
  const keys = useUnit(constructorModel.$keys);

  const chains = useMemo(() => {
    return dictionary(chainsService.getChainsData(), 'chainId');
  }, []);

  if (keys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Icon name="document" size={64} className="text-icon-default mb-6" />
        <SmallTitleText>No data available</SmallTitleText>
        <FootnoteText className="text-text-tertiary mt-2">
          Use the panel at the top to add derivation paths
        </FootnoteText>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex gap-x-6 px-5 pb-2 sticky top-0 z-10 bg-white">
        <HelpText className="text-text-tertiary">Network</HelpText>
        <HelpText className="text-text-tertiary">Keys</HelpText>
      </div>
      <ul className="flex flex-col gap-y-2">
        {keys.map((key, index) => {
          const keyData = Array.isArray(key) ? key[0] : key;

          if (keyData.keyType === KeyType.MAIN) return;

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
