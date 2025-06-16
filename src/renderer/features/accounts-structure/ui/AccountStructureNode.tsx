import { Handle, Position, useNodeConnections } from '@xyflow/react';
import { useMemo } from 'react';

import { useTransformer } from '@/shared/di';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { SmallTitleText } from '@/shared/ui/Typography';
import { Address } from '@/shared/ui-entities/Address/Address';
import { type AnyAccount, accountNodeConfigTransformer } from '@/domains/network';

type AccountStructureNodeProps = {
  data: {
    account: AnyAccount;
    isSelected: boolean;
  };
  id: string;
};

export const AccountStructureNode = ({ data, id }: AccountStructureNodeProps) => {
  const connections = useNodeConnections();
  const hasIncoming = useMemo(() => connections.some((conn) => conn.target === id), [connections, id]);
  const hasOutgoing = useMemo(() => connections.some((conn) => conn.source === id), [connections, id]);

  const config = useTransformer(accountNodeConfigTransformer, data.account);

  return (
    <>
      {/* show on hover */}
      {/*<NodeToolbar isVisible={true} position={Position.Top}>*/}
      {/*  toolbar*/}
      {/*</NodeToolbar>*/}

      <div className="flex overflow-hidden rounded-md bg-white shadow-md">
        <div className="w-1" style={{ background: config?.color ?? 'transparent' }} />
        <div className="w-[250px]">
          {hasIncoming && <Handle type="target" position={Position.Left} className="opacity-0" />}

          <div className="flex flex-col">
            <div style={{ background: data.isSelected ? config?.color : 'transparent' }}>
              <SmallTitleText
                className={cnTw(
                  'border-stroke border-b px-4 py-2',
                  data.isSelected ? 'text-white' : 'text-text-secondary',
                )}
              >
                {config?.title}
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
