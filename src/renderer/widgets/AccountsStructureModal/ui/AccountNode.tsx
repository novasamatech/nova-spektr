import { Handle, Position, useNodeConnections } from '@xyflow/react';
import { useMemo } from 'react';

import { toAddress } from '@/shared/lib/utils';
import { Address } from '@/shared/ui-entities/Address/Address';
import { type AnyAccount } from '@/domains/network';

interface AccountNodeProps {
  data: {
    label: string;
    account: AnyAccount;
  };
  id: string;
}

export const AccountNode = ({ data, id }: AccountNodeProps) => {
  const connections = useNodeConnections();
  const hasIncoming = useMemo(() => connections.some((conn) => conn.target === id), [connections, id]);
  const hasOutgoing = useMemo(() => connections.some((conn) => conn.source === id), [connections, id]);

  return (
    <>
      {/* show on hover */}
      {/*<NodeToolbar isVisible={true} position={Position.Top}>*/}
      {/*  toolbar*/}
      {/*</NodeToolbar>*/}

      <div className="border-stroke rounded-md border-2 bg-white px-4 py-2 shadow-md">
        {hasIncoming && <Handle type="target" position={Position.Left} className="opacity-0" />}

        <div className="flex flex-col gap-1">
          <div className="text-md font-medium">{data.label}</div>
          <div className="text-sm text-text-secondary">
            <Address address={toAddress(data.account.accountId)} variant="short" showIcon />
          </div>
          <div className="text-xs text-text-tertiary">
            {data.account.type === 'chain' ? 'Chain Account' : 'Universal Account'}
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
