import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  MarkerType,
  type Node,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import { useEffect, useMemo } from 'react';

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
  isSelected: boolean;
};

const LEVEL_SPACING = 400;
const NODE_SPACING = 115;

const AccountsStructureInner = ({ account, graph }: AccountsStructureProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AccountNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  // Memoize matrix and connections calculations
  const { matrix, connections } = useMemo(() => {
    const matrix: AccountNodeData[][] = [];
    const connections: { source: string; target: string }[] = [];
    const visited = new Set<string>();

    const processNodeForMatrix = (node: AccountNode, level: number) => {
      if (visited.has(node.account.id)) return;
      visited.add(node.account.id);

      // Ensure level array exists
      if (!matrix[level]) {
        matrix[level] = [];
      }

      // Add node to current level
      matrix[level].push({
        account: node.account,
        isSelected: node.account.id === account.id,
      });

      // Process children and add connections
      for (const child of node.children) {
        // Add connection for each parent-child relationship
        connections.push({
          source: child.account.id,
          target: node.account.id,
        });

        // Process child node in next level
        processNodeForMatrix(child, level + 1);
      }
    };

    // First, find root nodes (nodes that are not children of any other node)
    const childIds = new Set<string>();
    for (const [_, node] of graph) {
      for (const child of node.children) {
        childIds.add(child.account.id);
      }
    }

    // Process root nodes first
    for (const [_, node] of graph) {
      if (!childIds.has(node.account.id) && !visited.has(node.account.id)) {
        processNodeForMatrix(node, 0);
      }
    }

    // Then process remaining nodes
    for (const [_, node] of graph) {
      if (!visited.has(node.account.id)) {
        processNodeForMatrix(node, 0);
      }
    }

    return { matrix, connections };
  }, [graph, account.id]);

  console.log('Graph:', graph);
  console.log('Matrix:', matrix);
  console.log('Connections:', connections);

  // Stringified logs for sharing
  // console.log('Stringified Graph:', JSON.stringify(Array.from(graph.entries()), null, 2));
  // console.log('Stringified Matrix:', JSON.stringify(matrix, null, 2));
  // console.log('Stringified Connections:', JSON.stringify(connections, null, 2));

  useEffect(() => {
    // Create nodes from matrix
    const nodes = matrix.reduce((acc, level, levelIndex) => {
      const levelHeight = level.length * NODE_SPACING;
      const startY = -levelHeight / 2; // Start from the top of the centered group

      const levelNodes = level.map((nodeData, nodeIndex) => {
        const x = -levelIndex * LEVEL_SPACING;
        const y = startY + nodeIndex * NODE_SPACING;

        return {
          id: nodeData.account.id,
          type: 'accountNode',
          data: {
            account: nodeData.account,
            isSelected: nodeData.isSelected,
          },
          position: { x, y },
          sourcePosition: Position.Left,
          targetPosition: Position.Right,
        };
      });

      return [...acc, ...levelNodes];
    }, [] as Node<AccountNodeData>[]);

    // Create edges from connections
    const edges = connections.map((connection) => ({
      id: `e${connection.source}-${connection.target}`,
      source: connection.source,
      target: connection.target,
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
    }));

    setNodes(nodes);
    setEdges(edges);

    // Focus on the selected account node after nodes are set
    setTimeout(() => {
      fitView({
        nodes: [{ id: account.id }],
        padding: 0.5,
        maxZoom: 1,
        minZoom: 0.25,
        includeHiddenNodes: true,
      });
    }, 0);
  }, [graph, setNodes, setEdges, account.id, fitView, matrix, connections]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView={false}
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

export const AccountsStructure = (props: AccountsStructureProps) => (
  <ReactFlowProvider>
    <AccountsStructureInner {...props} />
  </ReactFlowProvider>
);
