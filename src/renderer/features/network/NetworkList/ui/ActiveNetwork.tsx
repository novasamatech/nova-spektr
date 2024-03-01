import { PropsWithChildren } from 'react';
import { Trans } from 'react-i18next';

import { ExtendedChain } from '@entities/network';
import { BodyText, StatusLabel, FootnoteText, HelpText } from '@shared/ui';
import { ChainIcon } from '@entities/chain';
import { ConnectionStatus } from '@shared/core';

import './styles.css';

const Status = {
  [ConnectionStatus.CONNECTING]: {
    variant: 'waiting',
    title: (
      <div className="spektr-waiting">
        <FootnoteText className="text-text-tertiary">
          <Trans>settings.networks.connectingStatusLabel</Trans>
        </FootnoteText>
      </div>
    ),
  },
  [ConnectionStatus.DISCONNECTED]: {
    variant: 'waiting',
    title: (
      <div className="spektr-waiting">
        <FootnoteText className="text-text-tertiary">
          <Trans>settings.networks.connectingStatusLabel</Trans>
        </FootnoteText>
      </div>
    ),
  },
  [ConnectionStatus.CONNECTED]: {
    variant: 'success',
    title: <Trans>settings.networks.connectedStatusLabel</Trans>,
  },
  [ConnectionStatus.ERROR]: {
    variant: 'error',
    title: <Trans>settings.networks.errorStatusLabel</Trans>,
  },
} as const;

type Props = {
  networkItem: ExtendedChain;
};

export const ActiveNetwork = ({ networkItem, children }: PropsWithChildren<Props>) => {
  return (
    <div className="flex items-center py-3">
      <ChainIcon src={networkItem.icon} name={networkItem.name} size={26} />
      <div className="flex flex-col ml-2 mr-auto pr-2 overflow-hidden">
        <BodyText className="truncate">{networkItem.name}</BodyText>
        {networkItem.connection.activeNode && (
          <HelpText className="text-text-tertiary truncate">{networkItem.connection.activeNode.url}</HelpText>
        )}
      </div>
      <StatusLabel
        title={Status[networkItem.connectionStatus].title}
        variant={Status[networkItem.connectionStatus].variant}
        className="mr-8.5"
      />
      {children}
    </div>
  );
};
