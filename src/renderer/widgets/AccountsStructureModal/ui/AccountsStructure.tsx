import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';

import { AccountNode } from './AccountNode';

const nodeTypes = {
  accountNode: AccountNode,
};

export const AccountsStructure = () => {
  const [nodes] = useNodesState([
    {
      id: '1',
      type: 'accountNode',
      data: { label: 'An input node' },
      position: { x: 0, y: 50 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    },
    {
      id: '2',
      type: 'accountNode',
      data: {
        label: 'A middle node',
        onChange: (value: any) => {
          console.log('on change', { value });
        },
      },
      position: { x: 300, y: 50 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    },
    {
      id: '3',
      type: 'accountNode',
      data: { label: 'Output A' },
      position: { x: 650, y: 25 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    },
    {
      id: '4',
      type: 'accountNode',
      data: { label: 'Output B' },
      position: { x: 650, y: 100 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    },
  ]);

  const [edges] = useEdgesState([
    {
      id: 'e1-2',
      source: '1',
      target: '2',
      style: { stroke: '#363643', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.Arrow,
        strokeWidth: 2,
        color: '#363643',
      },
    },
    {
      id: 'e2a-3',
      source: '2',
      target: '3',
      style: { stroke: '#363643', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.Arrow,
        strokeWidth: 2,
        color: '#363643',
      },
    },
    {
      id: 'e2b-4',
      source: '2',
      target: '4',
      style: { stroke: '#363643', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.Arrow,
        strokeWidth: 2,
        color: '#363643',
      },
    },
  ]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Controls showInteractive={false} />
      <Background variant={BackgroundVariant.Dots} gap={20} size={0.75} color="#363643" bgColor="#F9F9F9" />
    </ReactFlow>
  );
};
