import { Handle, Position, useNodeConnections } from '@xyflow/react';
import { useMemo } from 'react';

import { AccountType, SigningType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { SmallTitleText } from '@/shared/ui/Typography';
import { Address } from '@/shared/ui-entities/Address/Address';
import { type AnyAccount } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

interface AccountStructureNodeProps {
  data: {
    account: AnyAccount;
  };
  id: string;
}

type AccountStyle = {
  background: string;
};

function getAccountStyle(account: AnyAccount): AccountStyle {
  // Check account type first
  if ('accountType' in account) {
    switch (account.accountType) {
      case AccountType.PROXIED:
        return {
          background: 'linear-gradient(217deg, #23B4F2 11.88%, #2A0FD2 57.52%, #8A00CC 85.97%)',
        };
      case AccountType.FLEXIBLE_MULTISIG:
        return {
          background: 'linear-gradient(221deg, #8707D5 13.45%, #FF6928 86.32%)',
        };
      case AccountType.MULTISIG:
        return {
          background: 'linear-gradient(223deg, #D4FF59 -17.82%, #00AF9A 55.03%, #1AB775 100.43%)',
        };
    }
  }

  // Then check signing type
  switch (account.signingType) {
    case SigningType.POLKADOT_VAULT:
      return {
        background: '#EC007D',
      };
    case SigningType.PARITY_SIGNER:
      return {
        background: '#EC007D',
      };
    case SigningType.EXTENSION:
      return {
        background: '#FF8C00',
      };
    case SigningType.WALLET_CONNECT:
      return {
        background: '#3B99FC',
      };
    default:
      return {
        background: '#C3C3CB',
      };
  }
}

export const AccountStructureNode = ({ data, id }: AccountStructureNodeProps) => {
  const connections = useNodeConnections();
  const hasIncoming = useMemo(() => connections.some((conn) => conn.target === id), [connections, id]);
  const hasOutgoing = useMemo(() => connections.some((conn) => conn.source === id), [connections, id]);

  const { background } = getAccountStyle(data.account);

  return (
    <>
      {/* show on hover */}
      {/*<NodeToolbar isVisible={true} position={Position.Top}>*/}
      {/*  toolbar*/}
      {/*</NodeToolbar>*/}

      <div className="flex">
        <div className="w-1 rounded-l-md" style={{ background }} />
        <div className="w-[250px] rounded-md bg-white shadow-md">
          {hasIncoming && <Handle type="target" position={Position.Left} className="opacity-0" />}

          <div className="flex flex-col">
            <SmallTitleText className="border-stroke border-b px-4 py-2">{getAccountType(data.account)}</SmallTitleText>
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
