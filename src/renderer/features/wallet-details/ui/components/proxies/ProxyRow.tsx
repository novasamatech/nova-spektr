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
  const proxyWalletName = useWalletName(proxy.proxyWallet);

  const rowContent = (
    <div className="grid w-full grid-cols-[1.5fr_1fr_0.5fr_1.3fr] items-center gap-3 normal-case">
      <div className="min-w-0">
        <NamedAccount
          accountId={proxy.proxyAccountId}
          chain={chain ?? undefined}
          title={proxyWalletName ?? undefined}
          titleClass="text-footnote"
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
      <div className="flex min-w-0 justify-start">
        <ProxyStatusBadge status={proxy.status} />
      </div>
    </div>
  );

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
