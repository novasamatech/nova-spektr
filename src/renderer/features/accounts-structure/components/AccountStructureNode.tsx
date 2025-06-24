import { Handle, Position, useNodeConnections } from '@xyflow/react';
import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { useTransformer } from '@/shared/di';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { SmallTitleText } from '@/shared/ui/Typography';
import { Address } from '@/shared/ui-entities/Address/Address';
import { type AccountNode } from '@/domains/network';
import { accountNodeConfigTransformer } from '@/sdk/account';
import { accountsStructureModel } from '../model/accountsStructureModel';

type AccountStructureNodeProps = {
  data: {
    node: AccountNode;
    isSelected: boolean;
  };
  id: string;
};

export const AccountStructureNode = memo(({ data, id }: AccountStructureNodeProps) => {
  const highlightedNodesIds = useUnit(accountsStructureModel.$highlightedNodesIds);
  const connections = useNodeConnections();
  const hasIncoming = useMemo(() => connections.some((conn) => conn.target === id), [connections, id]);
  const hasOutgoing = useMemo(() => connections.some((conn) => conn.source === id), [connections, id]);

  const config = useTransformer(accountNodeConfigTransformer, { account: data.node.account });

  const shouldFade = highlightedNodesIds ? !highlightedNodesIds.has(data.node.account.id) : false;

  return (
    <>
      {/* show on hover */}
      {/*<NodeToolbar isVisible={true} position={Position.Top}>*/}
      {/*  toolbar*/}
      {/*</NodeToolbar>*/}

      <div
        className="flex cursor-pointer overflow-hidden rounded-md bg-white shadow-md"
        style={{
          opacity: shouldFade ? 0.2 : 1,
          transition: 'opacity 300ms',
        }}
        onMouseEnter={() => accountsStructureModel.enterAccountNode(data.node)}
        onMouseLeave={() => accountsStructureModel.leaveAccountNode()}
      >
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
                address={toAddress(data.node.account.accountId)}
                title={data.node.account.name}
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
});
