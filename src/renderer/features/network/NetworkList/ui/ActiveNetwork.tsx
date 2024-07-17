import { type PropsWithChildren } from 'react';
import { type TFunction } from 'react-i18next';

import { useI18n } from '@app/providers';

import { ConnectionStatus } from '@shared/core';
import { BodyText, FootnoteText, HelpText, StatusLabel } from '@shared/ui';

import { ChainIcon } from '@entities/chain';
import { type ExtendedChain } from '@entities/network';
import './styles.css';

const Status = {
  [ConnectionStatus.CONNECTING]: {
    variant: 'waiting',
    title: (t: TFunction) => (
      <div className="spektr-waiting">
        <FootnoteText className="text-text-tertiary">{t('settings.networks.connectingStatusLabel')}</FootnoteText>
      </div>
    ),
  },
  [ConnectionStatus.DISCONNECTED]: {
    variant: 'waiting',
    title: (t: TFunction) => (
      <div className="spektr-waiting">
        <FootnoteText className="text-text-tertiary">{t('settings.networks.connectingStatusLabel')}</FootnoteText>
      </div>
    ),
  },
  [ConnectionStatus.CONNECTED]: {
    variant: 'success',
    title: (t: TFunction) => t('settings.networks.connectedStatusLabel'),
  },
  [ConnectionStatus.ERROR]: {
    variant: 'error',
    title: (t: TFunction) => t('settings.networks.errorStatusLabel'),
  },
} as const;

type Props = {
  networkItem: ExtendedChain;
};

export const ActiveNetwork = ({ networkItem, children }: PropsWithChildren<Props>) => {
  const { t } = useI18n();

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
        title={Status[networkItem.connectionStatus].title(t)}
        variant={Status[networkItem.connectionStatus].variant}
        className="mr-8.5"
      />
      {children}
    </div>
  );
};
