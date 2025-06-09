import { Handle, Position, useNodeConnections } from '@xyflow/react';
import { useMemo } from 'react';

import { SigningType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { Address } from '@/shared/ui-entities/Address/Address';
import { type AnyAccount } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

interface AccountStructureNodeProps {
  data: {
    account: AnyAccount;
  };
  id: string;
}

export const AccountStructureNode = ({ data, id }: AccountStructureNodeProps) => {
  const connections = useNodeConnections();
  const hasIncoming = useMemo(() => connections.some((conn) => conn.target === id), [connections, id]);
  const hasOutgoing = useMemo(() => connections.some((conn) => conn.source === id), [connections, id]);

  return (
    <>
      {/* show on hover */}
      {/*<NodeToolbar isVisible={true} position={Position.Top}>*/}
      {/*  toolbar*/}
      {/*</NodeToolbar>*/}

      <div className="border-stroke w-[250px] rounded-md border-2 bg-white px-4 py-2 shadow-md">
        {hasIncoming && <Handle type="target" position={Position.Left} className="opacity-0" />}

        <div className="flex flex-col gap-1">
          <div className="text-md font-medium">{getAccountType(data.account)}</div>
          <div className="text-sm text-text-secondary">
            <Address
              address={toAddress(data.account.accountId)}
              title={data.account.name}
              variant="short"
              showIcon
              iconSize={24}
            />
          </div>
        </div>

        {hasOutgoing && (
          <Handle
            type="source"
            position={Position.Right}
            className="h-[6px] w-[6px] rounded-full border-2 border-[#363643] bg-transparent"
            style={{
              background: '#F9F9F9',
              border: '2px solid #363643',
              borderRadius: '4px',
              width: '6px',
              height: '6px',
              // transform: 'translate(1px, -5px)', // this moves the edge origin too
            }}
          />
        )}
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

  // Show wallet type based on signingType
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
