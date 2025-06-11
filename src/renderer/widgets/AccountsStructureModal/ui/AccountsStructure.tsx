import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  MarkerType,
  type Node,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import { useEffect } from 'react';

import { type AccountNode, type AnyAccount } from '@/domains/network';

import { AccountStructureNode } from './AccountStructureNode';

const nodeTypes = {
  accountNode: AccountStructureNode,
};

interface AccountsStructureProps {
  account: AnyAccount;
  graph: Map<AnyAccount, AccountNode>;
}

type AccountNodeData = {
  account: AnyAccount;
};

const LEVEL_SPACING = 400;
const NODE_SPACING = 150;

export const AccountsStructure = ({ account, graph }: AccountsStructureProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AccountNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const newNodes: Node<AccountNodeData>[] = [];
    const newEdges: Edge[] = [];
    const visited = new Set<string>();

    const calculateSubtreeHeight = (node: AccountNode): number => {
      if (node.children.length === 0) return 1;
      return node.children.reduce((sum, child) => sum + calculateSubtreeHeight(child), 0);
    };

    const processNode = (node: AccountNode, column: number, yOffset: number): number => {
      if (visited.has(node.account.id)) return 0;
      visited.add(node.account.id);

      const nodeId = node.account.id;
      // Start from the right side (negative x values)
      const x = -column * LEVEL_SPACING;
      const y = yOffset;

      newNodes.push({
        id: nodeId,
        type: 'accountNode',
        data: {
          account: node.account,
        },
        position: { x, y },
        // Swap source and target positions
        sourcePosition: Position.Left,
        targetPosition: Position.Right,
      });

      // Create edges for each child
      for (const child of node.children) {
        const edgeId = `e${child.account.id}-${nodeId}`;
        newEdges.push({
          id: edgeId,
          // Swap source and target
          source: child.account.id,
          target: nodeId,
          type: 'smoothstep',
          animated: false,
          style: {
            stroke: '#363643',
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.Arrow,
            width: 20,
            height: 20,
            color: '#363643',
          },
        });
      }

      // Process children with vertical spacing
      let currentYOffset = yOffset;
      for (const child of node.children) {
        const childHeight = calculateSubtreeHeight(child);
        processNode(child, column + 1, currentYOffset);
        currentYOffset += childHeight * NODE_SPACING;
      }

      return node.children.length;
    };

    // Process all accounts from the graph
    let currentYOffset = 0;
    for (const [_, node] of graph) {
      if (!visited.has(node.account.id)) {
        const height = calculateSubtreeHeight(node);
        processNode(node, 0, currentYOffset);
        currentYOffset += height * NODE_SPACING;
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [graph, setNodes, setEdges]);

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
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
    >
      <Controls showInteractive={false} />
      <Background variant={BackgroundVariant.Dots} gap={20} size={0.75} color="#363643" bgColor="#F9F9F9" />
    </ReactFlow>
  );
};
