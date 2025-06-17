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

import { nonNullable } from '@/shared/lib/utils';
import { type AccountNode, type AnyAccount } from '@/domains/network';

import { AccountStructureNode } from './AccountStructureNode';
import { CustomEdge } from './CustomEdge';

const nodeTypes = {
  accountNode: AccountStructureNode,
};

const edgeTypes = {
  custom: CustomEdge,
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

  const { matrix, connections } = useMemo(() => createGraphData(graph, account.id), [graph, account.id]);

  useEffect(() => {
    const nodes = createNodesFromMatrix(matrix);
    const edges = createEdgesFromConnections(connections);

    setNodes(nodes);
    setEdges(edges);

    const selectedNodeLevel = matrix.findIndex((level) => level.some((node) => node.account.id === account.id));
    const nodesToInclude = [
      matrix[selectedNodeLevel],
      matrix[selectedNodeLevel + 1],
      matrix[selectedNodeLevel + 2],
      matrix[selectedNodeLevel - 1],
      matrix[selectedNodeLevel - 2],
    ]
      .filter(nonNullable)
      .slice(0, 3)
      .flat()
      .map((node) => node.account);

    fitView({
      nodes: nodesToInclude,
      padding: 0.5,
      maxZoom: 0.75,
      minZoom: 0.75,
      includeHiddenNodes: true,
    });
  }, [graph, setNodes, setEdges, account.id, fitView, matrix, connections]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView={false}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{
        type: 'custom',
        animated: false,
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

function createNode(
  nodeData: AccountNodeData,
  levelIndex: number,
  nodeIndex: number,
  levelHeight: number,
): Node<AccountNodeData> {
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
}

function createEdge(connection: { source: string; target: string }): Edge {
  return {
    id: `e${connection.source}-${connection.target}`,
    source: connection.source,
    target: connection.target,
  };
}

function createNodesFromMatrix(matrix: AccountNodeData[][]): Node<AccountNodeData>[] {
  return matrix.reduce((acc, level, levelIndex) => {
    const levelHeight = level.length * NODE_SPACING;
    const levelNodes = level.map((nodeData, nodeIndex) => createNode(nodeData, levelIndex, nodeIndex, levelHeight));
    return [...acc, ...levelNodes];
  }, [] as Node<AccountNodeData>[]);
}

function createEdgesFromConnections(connections: { source: string; target: string }[]): Edge[] {
  return connections.map(createEdge);
}

function createGraphData(graph: Map<AnyAccount, AccountNode>, selectedAccountId: string) {
  const matrix: AccountNodeData[][] = [];
  const connections: { source: string; target: string }[] = [];
  const visited = new Set<string>();
  const nodeLevels = new Map<string, number>();
  const processedConnections = new Set<string>();

  function processNodeForMatrix(node: AccountNode, level: number) {
    if (visited.has(node.account.id)) return;
    visited.add(node.account.id);
    nodeLevels.set(node.account.id, level);

    if (!matrix[level]) {
      matrix[level] = [];
    }

    matrix[level].push({
      account: node.account,
      isSelected: node.account.id === selectedAccountId,
    });

    for (const child of node.children) {
      const connectionId = `${child.account.id}-${node.account.id}`;

      if (!processedConnections.has(connectionId)) {
        connections.push({
          source: child.account.id,
          target: node.account.id,
        });
        processedConnections.add(connectionId);
      }

      const childLevel = nodeLevels.get(child.account.id);
      if (childLevel !== undefined) {
        if (childLevel <= level) {
          const newLevel = level + 1;
          matrix[childLevel] = matrix[childLevel].filter((n) => n.account.id !== child.account.id);
          if (!matrix[newLevel]) {
            matrix[newLevel] = [];
          }
          matrix[newLevel].push({
            account: child.account,
            isSelected: child.account.id === selectedAccountId,
          });
          nodeLevels.set(child.account.id, newLevel);
          processNodeForMatrix(child, newLevel);
        }
      } else {
        processNodeForMatrix(child, level + 1);
      }
    }
  }

  const childIds = new Set<string>();
  for (const [_, node] of graph) {
    for (const child of node.children) {
      childIds.add(child.account.id);
    }
  }

  for (const [_, node] of graph) {
    if (!childIds.has(node.account.id) && !visited.has(node.account.id)) {
      processNodeForMatrix(node, 0);
    }
  }

  for (const [_, node] of graph) {
    if (!visited.has(node.account.id)) {
      processNodeForMatrix(node, 0);
    }
  }

  return { matrix, connections };
}
