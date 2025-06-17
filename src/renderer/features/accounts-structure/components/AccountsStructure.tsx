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
import ELK from 'elkjs/lib/elk.bundled.js';
import { useEffect, useMemo } from 'react';

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

const elk = new ELK();

const AccountsStructureInner = ({ account, graph }: AccountsStructureProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AccountNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  const { matrix, connections } = useMemo(() => createGraphData(graph, account.id), [graph, account.id]);

  useEffect(() => {
    const nodes = createNodesFromMatrix(matrix);
    const edges = createEdgesFromConnections(connections);

    // Create ELK graph
    const elkGraph = {
      id: 'root',
      children: nodes.map((node) => ({
        id: node.id,
        width: 250, // Width of your custom node
        height: 100, // Height of your custom node
      })),
      edges: connections.map((c) => ({
        id: `e${c.source}-${c.target}`,
        sources: [c.source],
        targets: [c.target],
      })),
    };

    // Apply ELK layout
    elk
      .layout(elkGraph, {
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'RIGHT',
          'elk.layered.spacing.nodeNodeBetweenLayers': '100',
          'elk.spacing.nodeNode': '20',
          'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
        },
      })
      .then((layoutGraph) => {
        console.log({ layoutGraph, nodes });
        const layoutNodes = nodes.map((node) => {
          const layoutNode = layoutGraph.children?.find((n) => n.id === node.id);
          if (layoutNode) {
            return {
              ...node,
              position: {
                x: layoutNode.x || 0,
                y: layoutNode.y || 0,
              },
            };
          }
          return node;
        });

        setNodes(layoutNodes);
        setEdges(edges);

        const selectedNode = layoutNodes.find((node) => node.data.account.id === account.id);
        if (selectedNode) {
          fitView({
            nodes: [selectedNode],
            padding: 0.5,
            maxZoom: 0.75,
            minZoom: 0.75,
            includeHiddenNodes: true,
          });
        }
      });
  }, [graph, setNodes, setEdges, account.id, fitView, matrix, connections]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView={false}
      nodesDraggable={true}
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

function createNode(nodeData: AccountNodeData): Node<AccountNodeData> {
  return {
    id: nodeData.account.id,
    type: 'accountNode',
    data: {
      account: nodeData.account,
      isSelected: nodeData.isSelected,
    },
    position: { x: 0, y: 0 }, // Initial position, will be updated by ELK
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
  return matrix.reduce((acc, level) => {
    const levelNodes = level.map((nodeData) => createNode(nodeData));
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
