import { useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { FootnoteText } from '@/shared/ui';
import { Accordion, Box, Label } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { NamedAccount } from '@/widgets/NameResolver';
import { type WalletProxy } from '../../../model/proxies-model';

import { ProxyDetails } from './ProxyDetails';
import { ProxyStatusBadge } from './ProxyStatusBadge';

type Props = {
  proxy: WalletProxy;
  verifyAction: ReactNode | null;
  editAction?: ReactNode | null;
  onRemove?: (proxy: WalletProxy) => void;
  onCloseWalletDetails?: () => void;
};

export const ProxyRow = ({ proxy, verifyAction, editAction, onRemove, onCloseWalletDetails }: Props) => {
  const chains = useUnit(networkModel.$chains);
  const chain = chains[proxy.chainId] ?? null;

  return (
    <li className="border-b border-divider px-2 py-1.5 last:border-b-0">
      <Accordion initialOpen={false}>
        <Accordion.Trigger>
          <div className="flex w-full items-center normal-case">
            <div className="min-w-0 flex-1">
              <Box direction="row" gap={2} verticalAlign="center" horizontalAlign="space-between" fitContainer>
                <div className="min-w-0 flex-1">
                  <NamedAccount accountId={proxy.proxyAccountId} chain={chain ?? undefined} variant="truncate" />
                </div>
                <div className="shrink-0">
                  {chain ? (
                    <ChainTitle chain={chain} iconSize={12} fontClass="text-text-tertiary" />
                  ) : (
                    <FootnoteText className="text-text-tertiary">{proxy.chainId}</FootnoteText>
                  )}
                </div>
                <div className="shrink-0">
                  <Label variant="gray">{proxy.proxyType}</Label>
                </div>
                <div className="shrink-0">
                  <ProxyStatusBadge status={proxy.status} />
                </div>
              </Box>
            </div>
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <ProxyDetails
            proxy={proxy}
            verifyAction={verifyAction}
            editAction={editAction}
            onRemove={onRemove}
            onCloseWalletDetails={onCloseWalletDetails}
          />
        </Accordion.Content>
      </Accordion>
    </li>
  );
};
