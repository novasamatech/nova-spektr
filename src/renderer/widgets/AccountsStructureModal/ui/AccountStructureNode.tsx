import { Handle, Position, useNodeConnections } from '@xyflow/react';
import { useMemo } from 'react';

import { AccountType, SigningType } from '@/shared/core';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { SmallTitleText } from '@/shared/ui/Typography';
import { Address } from '@/shared/ui-entities/Address/Address';
import { type AnyAccount } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

type AccountStructureNodeProps = {
  data: {
    account: AnyAccount;
    isSelected: boolean;
  };
  id: string;
};

type AccountStyle = {
  stripeBackground: string;
  titleBackground: string;
};

function getAccountStyle(account: AnyAccount): AccountStyle {
  if ('accountType' in account) {
    switch (account.accountType) {
      case AccountType.PROXIED:
        return {
          stripeBackground: 'var(--label-lightblue-default)',
          titleBackground: 'var(--label-lightblue-default)',
        };
      case AccountType.FLEXIBLE_MULTISIG:
        return {
          stripeBackground: 'var(--label-purple-default)',
          titleBackground: 'var(--label-purple-default)',
        };
      case AccountType.MULTISIG:
        return {
          stripeBackground: 'var(--label-background-green)',
          titleBackground: 'var(--label-background-green)',
        };
    }
  }

  switch (account.signingType) {
    case SigningType.POLKADOT_VAULT:
    case SigningType.PARITY_SIGNER:
      return {
        stripeBackground: 'var(--badge-red-background)',
        titleBackground: 'var(--badge-red-background)',
      };
    case SigningType.EXTENSION:
      return {
        stripeBackground: 'var(--badge-orange-background-default)',
        titleBackground: 'var(--badge-orange-background-default)',
      };
    case SigningType.WALLET_CONNECT:
      return {
        stripeBackground: 'var(--badge-background)',
        titleBackground: 'var(--badge-background)',
      };
    default:
      return {
        stripeBackground: 'var(--icon-default)',
        titleBackground: 'var(--icon-default)',
      };
  }
}

export const AccountStructureNode = ({ data, id }: AccountStructureNodeProps) => {
  const connections = useNodeConnections();
  const hasIncoming = useMemo(() => connections.some((conn) => conn.target === id), [connections, id]);
  const hasOutgoing = useMemo(() => connections.some((conn) => conn.source === id), [connections, id]);

  const { stripeBackground, titleBackground } = getAccountStyle(data.account);

  return (
    <>
      {/* show on hover */}
      {/*<NodeToolbar isVisible={true} position={Position.Top}>*/}
      {/*  toolbar*/}
      {/*</NodeToolbar>*/}

      <div className="flex overflow-hidden rounded-md bg-white shadow-md">
        <div className="w-1" style={{ background: stripeBackground }} />
        <div className="w-[250px]">
          {hasIncoming && <Handle type="target" position={Position.Left} className="opacity-0" />}

          <div className="flex flex-col">
            <div style={{ background: data.isSelected ? titleBackground : 'transparent' }}>
              <SmallTitleText
                className={cnTw(
                  'border-stroke border-b px-4 py-2',
                  data.isSelected ? 'text-white' : 'text-text-secondary',
                )}
              >
                {getAccountType(data.account)}
              </SmallTitleText>
            </div>
            <div className="px-4 py-2 text-sm text-text-secondary">
              <Address
                address={toAddress(data.account.accountId)}
                title={data.account.name}
                variant="short"
                showIcon
                iconSize={24}
              />
            </div>
          </div>

          {hasOutgoing && <Handle type="source" position={Position.Right} className="opacity-0" />}
        </div>
      </div>
    </>
  );
};

function getAccountType(account: AnyAccount) {
  if (accountUtils.isWcAccount(account)) {
    return 'WalletConnect';
  }
  if (accountUtils.isProxiedAccount(account)) {
    return 'Proxied';
  }
  if (accountUtils.isMultisigAccount(account)) {
    return 'Multisig';
  }

  switch (account.signingType) {
    case SigningType.POLKADOT_VAULT:
      return 'Vault';
    case SigningType.EXTENSION:
      return 'Polkadot.js Extension';
    case SigningType.PARITY_SIGNER:
      return 'Parity Signer';
    case SigningType.WALLET_CONNECT:
      return 'WalletConnect';
    case SigningType.WATCH_ONLY:
      return 'Watch Only';
    case SigningType.MULTISIG:
      return 'Multisig';
    default:
      return account.type;
  }
}
