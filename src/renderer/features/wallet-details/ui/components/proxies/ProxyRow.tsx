import { useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { FootnoteText } from '@/shared/ui';
import { Accordion, Label } from '@/shared/ui-kit';
import { useWalletName } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { NamedAccount } from '@/widgets/NameResolver';
import { type WalletProxy } from '../../../model/proxies-model';

import { ProxyDetails } from './ProxyDetails';
import { ProxyStatusBadge } from './ProxyStatusBadge';

type Props = {
  proxy: WalletProxy;
  verifyAction: ReactNode | null;
  onRemove?: (proxy: WalletProxy) => void;
  onCloseWalletDetails?: () => void;
};

export const ProxyRow = ({ proxy, verifyAction, onRemove, onCloseWalletDetails }: Props) => {
  const chains = useUnit(networkModel.$chains);
  const chain = chains[proxy.chainId] ?? null;
  const isMultisigProxy = proxy.proxyMultisigAccountId !== null;
  const proxyWalletName = useWalletName(proxy.proxyWallet);

  const rowContent = (
    <div className="grid w-full grid-cols-[minmax(0,1fr)_160px_96px_144px] items-center gap-3 normal-case">
      <div className="min-w-0">
        <NamedAccount
          accountId={proxy.proxyAccountId}
          chain={chain ?? undefined}
          title={proxyWalletName ?? undefined}
          variant="truncate"
          iconSize={28}
        />
      </div>
      <div className="min-w-0">
        {chain ? (
          <ChainTitle chain={chain} iconSize={16} className="min-w-0" fontClass="truncate text-text-tertiary" />
        ) : (
          <FootnoteText className="truncate text-text-tertiary">{proxy.chainId}</FootnoteText>
        )}
      </div>
      <div className="flex min-w-0 justify-start">
        <Label variant="gray">{proxy.proxyType}</Label>
      </div>
      {isMultisigProxy && (
        <div className="flex min-w-0 justify-start">
          <ProxyStatusBadge status={proxy.status} />
        </div>
      )}
    </div>
  );

  if (!isMultisigProxy) {
    return (
      <li className="border-b border-divider px-2 py-1.5 last:border-b-0">
        <div className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-caption text-text-secondary uppercase">
          <div className="flex min-w-0 grow items-center gap-2 truncate text-start">{rowContent}</div>
        </div>
      </li>
    );
  }

  return (
    <li className="border-b border-divider px-3 py-3 last:border-b-0">
      <Accordion initialOpen={false}>
        <Accordion.Trigger>{rowContent}</Accordion.Trigger>
        <Accordion.Content>
          <ProxyDetails
            proxy={proxy}
            verifyAction={verifyAction}
            onRemove={onRemove}
            onCloseWalletDetails={onCloseWalletDetails}
          />
        </Accordion.Content>
      </Accordion>
    </li>
  );
};
