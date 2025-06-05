import { Handle, Position, useNodeConnections } from '@xyflow/react';
import { useMemo } from 'react';

interface AccountNodeProps {
  data: {
    label: string;
  };
  id: string;
}

export const AccountNode = ({ data, id }: AccountNodeProps) => {
  const connections = useNodeConnections();
  const hasIncoming = useMemo(() => connections.some((conn) => conn.target === id), [connections, id]);
  const hasOutgoing = useMemo(() => connections.some((conn) => conn.source === id), [connections, id]);

  return (
    <div className="border-stroke rounded-md border-2 bg-white px-4 py-2 shadow-md">
      {hasIncoming && <Handle type="target" position={Position.Left} className="h-3 w-3 opacity-0" />}
      <div className="flex items-center">
        <div className="ml-2">
          <div className="text-md">{data.label}</div>
        </div>
      </div>
      {hasOutgoing && <Handle type="source" position={Position.Right} className="h-3 w-3" />}
    </div>
  );
};
