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
import { useUnit } from 'effector-react';
import ELK from 'elkjs/lib/elk.bundled.js';
import { memo, useEffect, useRef } from 'react';

import { useClickOutside } from '@/shared/lib/hooks';
import { type AccountNode, type AnyAccount } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';
import { accountsStructureModel, focusOnSelected } from '../model/accountsStructureModel';

import { AccountStructureNode } from './AccountStructureNode';
import { CustomEdge } from './CustomEdge';

const nodeTypes = {
  accountNode: AccountStructureNode,
};

const edgeTypes = {
  accountEdge: CustomEdge,
};

type AccountNodeData = {
  node: AccountNode;
  isSelected: boolean;
};

const elk = new ELK({
  defaultLayoutOptions: {
    'elk.algorithm': 'layered',
    'elk.direction': 'RIGHT',
    'elk.layered.spacing.nodeNodeBetweenLayers': '200',
    'elk.spacing.nodeNode': '50',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.crossingMinimization.greedySwitch.type': 'TWO_SIDED',
    'elk.layered.crossingMinimization.greedySwitch.activationThreshold': '0',
    'elk.layered.crossingMinimization.greedySwitchHierarchical.type': 'TWO_SIDED',
    'elk.layered.crossingMinimization.hierarchicalSweepiness': '0.5',
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    'elk.layered.nodePlacement.bk.edgeStraightening': 'ALWAYS',
    'elk.layered.nodePlacement.bk.fixedAlignment': 'TOP',
    'elk.alignment': 'TOP',
    'elk.alg.libavoid.clusterCrossingPenalty': '1',
    'elk.alg.libavoid.crossingPenalty': '1',
    'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
    'elk.layered.mergeHierarchyEdges': 'false',
    'elk.layered.spacing.edgeEdgeBetweenLayers': '15',
    'elk.layered.spacing.edgeNode': '10',
    'elk.layered.spacing.edgeEdge': '10',
    'elk.layered.spacing.baseValue': '10',
    'elk.layered.spacing.individual': 'true',
  },
});

function createGraphElements(graph: Map<AnyAccount, AccountNode>, selectedAccountId: string) {
  const nodes: Node<AccountNodeData>[] = [];
  const edges: Edge[] = [];
  const processedNodes = new Set<string>();

  function processNode(node: AccountNode) {
    if (processedNodes.has(node.account.accountId)) return;
    processedNodes.add(node.account.accountId);

    nodes.push({
      id: node.account.accountId,
      type: 'accountNode',
      data: {
        node,
        isSelected: node.account.accountId === selectedAccountId,
      },
      position: { x: 0, y: 0 },
      sourcePosition: Position.Left,
      targetPosition: Position.Right,
    });

    for (const child of node.children) {
      edges.push({
        id: `e${child.account.accountId}-${node.account.accountId}`,
        source: child.account.accountId,
        target: node.account.accountId,
        data: {
          source: child.account,
          target: node.account,
        },
        markerEnd: {
          color: accountUtils.isMultisigAccount(node.account) ? '#05B199' : '#2A1FD5',
          type: MarkerType.Arrow,
          width: 20,
          height: 20,
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

const AccountsStructureInner = () => {
  const graph = useUnit(accountsStructureModel.$graph);
  const selectedAccount = useUnit(accountsStructureModel.$selectedAccount);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AccountNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();
  const graphRef = useRef<HTMLDivElement>(null);

  useClickOutside([graphRef], () => accountsStructureModel.releaseAccountNode());

  useEffect(() => {
    if (!graph || !selectedAccount) return;

    const { nodes, edges } = createGraphElements(graph, selectedAccount.accountId);

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
        const layoutNodes: Node<AccountNodeData>[] = nodes.map((node) => {
          const layoutNode = layoutNodesMap.get(node.id);
          return {
            ...node,
            position: {
              x: layoutNode?.x ?? node.position.x,
              y: layoutNode?.y ?? node.position.y,
            },
          };
        });

        setNodes(layoutNodes.length <= 15 ? alignNodesTop(layoutNodes) : layoutNodes);
        setEdges(edges);

        fitView({
          padding: { top: '75px', bottom: '25px', left: '25px', right: '25px' },
        });
      });
  }, [graph, selectedAccount, fitView]);

  useEffect(
    () =>
      // eslint-disable-next-line effector/no-watch
      focusOnSelected.watch(
        () => selectedAccount && fitView({ nodes: [{ id: selectedAccount.accountId }], maxZoom: 0.5, duration: 500 }),
      ),
    [fitView, selectedAccount],
  );

  return (
    <div ref={graphRef} className="h-full" onClick={() => accountsStructureModel.releaseAccountNode()}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={false}
        minZoom={0}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'accountEdge',
          animated: false,
        }}
        className="h-full"
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
      >
        <Controls showInteractive={false} />
        <Background variant={BackgroundVariant.Dots} gap={20} size={0.75} color="#363643" bgColor="#F9F9F9" />
      </ReactFlow>
    </div>
  );
};

export const AccountsStructure = memo(() => (
  <ReactFlowProvider>
    <AccountsStructureInner />
  </ReactFlowProvider>
));

function alignNodesTop(nodes: Node<AccountNodeData>[]) {
  const layerGroups: Record<number, Node<AccountNodeData>[]> = {};
  for (const node of nodes) {
    const key = Math.floor(node.position.x / 200);
    if (!layerGroups[key]) {
      layerGroups[key] = [];
    }
    layerGroups[key].push(node);
  }

  for (const group of Object.values(layerGroups)) {
    const minY = Math.min(...group.map((n) => n.position.y));
    for (const n of group) {
      n.position.y -= minY - 20;
    }
  }

  return nodes;
}
