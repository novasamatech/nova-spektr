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
import { memo, useEffect } from 'react';

import { type AccountNode, type AnyAccount } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

import { AccountStructureNode } from './AccountStructureNode';
import { CustomEdge } from './CustomEdge';

const nodeTypes = {
  accountNode: AccountStructureNode,
};

const edgeTypes = {
  accountEdge: CustomEdge,
};

interface AccountsStructureProps {
  account: AnyAccount;
  graph: Map<AnyAccount, AccountNode>;
  pathType: 'straight' | 'bezier' | 'smoothStep';
}

type AccountNodeData = {
  account: AnyAccount;
  isSelected: boolean;
};

const elk = new ELK({
  defaultLayoutOptions: {
    'elk.algorithm': 'layered',
    'elk.direction': 'RIGHT',
    'elk.layered.spacing.nodeNodeBetweenLayers': '100',
    'elk.spacing.nodeNode': '50',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.crossingMinimization.greedySwitch.type': 'TWO_SIDED',
    'elk.layered.crossingMinimization.greedySwitch.activationThreshold': '0',
    'elk.layered.crossingMinimization.greedySwitchHierarchical.type': 'TWO_SIDED',
    'elk.layered.crossingMinimization.hierarchicalSweepiness': '0.5',
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    'elk.layered.nodePlacement.bk.edgeStraightening': 'ALWAYS',
    'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
    'org.eclipse.elk.alignment': 'CENTER',
    'org.eclipse.elk.alg.libavoid.clusterCrossingPenalty': '1',
    'org.eclipse.elk.alg.libavoid.crossingPenalty': '1',
    'org.eclipse.elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
    'org.eclipse.elk.layered.mergeHierarchyEdges': 'false',
    'elk.layered.spacing.edgeEdgeBetweenLayers': '50',
    'elk.layered.spacing.edgeNode': '50',
    'elk.layered.spacing.edgeEdge': '50',
    'elk.layered.spacing.baseValue': '50',
    'elk.layered.spacing.individual': 'true',
  },
});

function createGraphElements(
  graph: Map<AnyAccount, AccountNode>,
  selectedAccountId: string,
  pathType: 'straight' | 'bezier' | 'bezierSimple' | 'smoothStep',
) {
  const nodes: Node<AccountNodeData>[] = [];
  const edges: Edge[] = [];
  const processedNodes = new Set<string>();

  function processNode(node: AccountNode) {
    if (processedNodes.has(node.account.id)) return;
    processedNodes.add(node.account.id);

    nodes.push({
      id: node.account.id,
      type: 'accountNode',
      data: {
        account: node.account,
        isSelected: node.account.id === selectedAccountId,
      },
      position: { x: 0, y: 0 },
      sourcePosition: Position.Left,
      targetPosition: Position.Right,
    });

    let label: string | undefined;

    const targetAcc = node.account;
    if (accountUtils.isProxiedAccount(targetAcc)) {
      label = targetAcc.proxyType;
    }

    for (const child of node.children) {
      edges.push({
        id: `e${child.account.id}-${node.account.id}`,
        source: child.account.id,
        target: node.account.id,
        data: {
          label,
          pathType,
        },
      });
      processNode(child);
    }
  }

  // Process all root nodes
  for (const [_, node] of graph) {
    processNode(node);
  }

  return { nodes, edges };
}

const AccountsStructureInner = ({ account, graph, pathType }: AccountsStructureProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AccountNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  useEffect(() => {
    const { nodes, edges } = createGraphElements(graph, account.id, pathType);

    elk
      .layout({
        id: 'root',
        children: nodes.map((node) => ({
          id: node.id,
          width: 250,
          height: 100,
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
      })
      .then((layoutGraph) => {
        const layoutNodesMap = new Map(layoutGraph.children?.map((i) => [i.id, i]) ?? []);
        const layoutNodes = nodes.map((node) => {
          const layoutNode = layoutNodesMap.get(node.id);
          return {
            ...node,
            position: {
              x: layoutNode?.x ?? node.position.x,
              y: layoutNode?.y ?? node.position.y,
            },
          };
        });

        setNodes(layoutNodes);
        setEdges(edges);

        fitView();
      });
  }, [graph, account.id, fitView, pathType]);

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
        type: 'accountEdge',
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

export const AccountsStructure = memo((props: AccountsStructureProps) => (
  <ReactFlowProvider>
    <AccountsStructureInner {...props} />
  </ReactFlowProvider>
));
