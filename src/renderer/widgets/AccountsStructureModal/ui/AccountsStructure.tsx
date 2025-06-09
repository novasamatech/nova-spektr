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

import { type AccountNode as AccountNodeType } from '@/domains/network';

import { AccountNode } from './AccountNode';

const nodeTypes = {
  accountNode: AccountNode,
};

interface AccountsStructureProps {
  accountGraph: Map<string, AccountNodeType>;
}

type AccountNodeData = {
  label: string;
  account: AccountNodeType['account'];
  [key: string]: unknown;
};

const LEVEL_SPACING = 400;
const NODE_SPACING = 150;

export const AccountsStructure = ({ accountGraph }: AccountsStructureProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AccountNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const newNodes: Node<AccountNodeData>[] = [];
    const newEdges: Edge[] = [];
    const visited = new Set<string>();

    // First pass: calculate total height needed for each node's subtree
    const calculateSubtreeHeight = (node: AccountNodeType): number => {
      if (node.children.length === 0) return 1;
      return node.children.reduce((sum, child) => sum + calculateSubtreeHeight(child), 0);
    };

    // Second pass: position nodes
    const processNode = (node: AccountNodeType, column: number, yOffset: number): number => {
      if (visited.has(node.account.id)) return 0;
      visited.add(node.account.id);

      const nodeId = node.account.id;
      const x = column * LEVEL_SPACING;
      const y = yOffset;

      newNodes.push({
        id: nodeId,
        type: 'accountNode',
        data: {
          label: node.account.name,
          account: node.account,
        },
        position: { x, y },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      // Create edges for each child
      for (const child of node.children) {
        const edgeId = `e${nodeId}-${child.account.id}`;
        newEdges.push({
          id: edgeId,
          source: nodeId,
          target: child.account.id,
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

    // Find root nodes (nodes that are not children of any other node)
    const rootNodes = Array.from(accountGraph.values()).filter((node) => {
      for (const otherNode of accountGraph.values()) {
        if (otherNode.children.some((child) => child.account.id === node.account.id)) {
          return false;
        }
      }
      return true;
    });

    // Process all root nodes
    let currentYOffset = 0;
    for (const node of rootNodes) {
      const height = calculateSubtreeHeight(node);
      processNode(node, 0, currentYOffset);
      currentYOffset += height * NODE_SPACING;
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [accountGraph, setNodes, setEdges]);

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
