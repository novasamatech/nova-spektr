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

const createNode = (
  nodeData: AccountNodeData,
  levelIndex: number,
  nodeIndex: number,
  levelHeight: number,
): Node<AccountNodeData> => {
  const startY = -levelHeight / 2;
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
};

const createEdge = (connection: { source: string; target: string }): Edge => ({
  id: `e${connection.source}-${connection.target}`,
  source: connection.source,
  target: connection.target,
});

const createNodesFromMatrix = (matrix: AccountNodeData[][]): Node<AccountNodeData>[] => {
  return matrix.reduce((acc, level, levelIndex) => {
    const levelHeight = level.length * NODE_SPACING;
    const levelNodes = level.map((nodeData, nodeIndex) => createNode(nodeData, levelIndex, nodeIndex, levelHeight));
    return [...acc, ...levelNodes];
  }, [] as Node<AccountNodeData>[]);
};

const createEdgesFromConnections = (connections: { source: string; target: string }[]): Edge[] => {
  return connections.map(createEdge);
};

const AccountsStructureInner = ({ account, graph }: AccountsStructureProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AccountNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  const { matrix, connections } = useMemo(() => {
    const matrix: AccountNodeData[][] = [];
    const connections: { source: string; target: string }[] = [];
    const visited = new Set<string>();
    const nodeLevels = new Map<string, number>();
    const processedConnections = new Set<string>();

    const processNodeForMatrix = (node: AccountNode, level: number) => {
      if (visited.has(node.account.id)) return;
      visited.add(node.account.id);
      nodeLevels.set(node.account.id, level);

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
        const connectionId = `${child.account.id}-${node.account.id}`;

        // Always add the connection if we haven't processed it yet
        if (!processedConnections.has(connectionId)) {
          connections.push({
            source: child.account.id,
            target: node.account.id,
          });
          processedConnections.add(connectionId);
        }

        // Check if child is already in a level
        const childLevel = nodeLevels.get(child.account.id);
        if (childLevel !== undefined) {
          // If child is in a level <= current level, we need to move it to a higher level
          if (childLevel <= level) {
            const newLevel = level + 1;
            // Remove child from its current level
            matrix[childLevel] = matrix[childLevel].filter((n) => n.account.id !== child.account.id);
            // Add child to new level
            if (!matrix[newLevel]) {
              matrix[newLevel] = [];
            }
            matrix[newLevel].push({
              account: child.account,
              isSelected: child.account.id === account.id,
            });
            nodeLevels.set(child.account.id, newLevel);
            // Recursively process the child's children with the new level
            processNodeForMatrix(child, newLevel);
          }
        } else {
          // Process child node in next level
          processNodeForMatrix(child, level + 1);
        }
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

  useEffect(() => {
    const nodes = createNodesFromMatrix(matrix);
    const edges = createEdgesFromConnections(connections);

    setNodes(nodes);
    setEdges(edges);

    fitView({
      nodes: [account],
      padding: 0.5,
      maxZoom: 0.75,
      minZoom: 0.25,
      includeHiddenNodes: true,
    });
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
      defaultEdgeOptions={{
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#363643', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.Arrow,
          width: 20,
          height: 20,
          color: '#363643',
        },
      }}
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
