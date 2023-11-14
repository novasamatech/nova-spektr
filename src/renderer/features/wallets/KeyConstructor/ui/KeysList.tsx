import { useUnit } from 'effector-react';

import { HelpText, IconButton, FootnoteText, SmallTitleText, Icon } from '@shared/ui';
import { constructorModel } from '../model/constructor-model';

export const KeysList = () => {
  const keys = useUnit(constructorModel.$keys);

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
    <div className="flex flex-col gap-y-2 h-full">
      <div className="flex gap-x-6">
        <HelpText>Network</HelpText>
        <HelpText>Keys</HelpText>
      </div>
      <ul>
        {keys.map((key, index) => (
          <li key={index} className="flex ">
            <div className="py-4.5 px-6">network</div>
            {/*<ChainIcon src={key.icon} name={key.name} />*/}
            <div className="flex flex-col gap-y-1 py-1.5">
              <FootnoteText className="text-text-primary">Polkadot account</FootnoteText>
              <FootnoteText className="text-text-secondary">/polkadot/test</FootnoteText>
            </div>
            <IconButton
              name="delete"
              className="hover:text-text-negative focus:text-text-negative"
              onClick={() => console.log(123)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};
