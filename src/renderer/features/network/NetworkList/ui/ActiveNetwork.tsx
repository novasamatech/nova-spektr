import { type TFunction } from 'i18next';
import { type PropsWithChildren } from 'react';

import { ConnectionStatus } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BodyText, FootnoteText, HelpText, StatusLabel } from '@/shared/ui';
import { ChainIcon } from '@/shared/ui-entities';
import { type ExtendedChain } from '@/entities/network';
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
      <ChainIcon chain={networkItem} size={26} />
      <div className="mr-auto ml-2 flex flex-col overflow-hidden pr-2">
        <BodyText className="truncate">{networkItem.name}</BodyText>
        {networkItem.connection.activeNode && (
          <HelpText className="truncate text-text-tertiary">{networkItem.connection.activeNode.url}</HelpText>
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
