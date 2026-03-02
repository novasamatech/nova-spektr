import {
  type Edge,
  type Node,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import { useUnit } from 'effector-react';
import ELK from 'elkjs/lib/elk.bundled.js';
import { type TFunction } from 'i18next';
import { memo, useCallback, useEffect, useRef } from 'react';

import { useI18n } from '@/shared/i18n';
import { useClickOutside } from '@/shared/lib/hooks';
import { type AccountNode, type AnyAccount } from '@/domains/network';
import { accountConnectionTransformer } from '@/sdk/account';
import { accountsStructureModel } from '../model/accountsStructureModel';

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
    'elk.spacing.edgeNode': '75',
    'elk.spacing.edgeEdge': '75',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.crossingMinimization.greedySwitch.type': 'TWO_SIDED',
    'elk.layered.crossingMinimization.greedySwitch.activationThreshold': '0',
    'elk.layered.crossingMinimization.greedySwitchHierarchical.type': 'TWO_SIDED',
    'elk.layered.crossingMinimization.hierarchicalSweepiness': '0.5',
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    'elk.layered.nodePlacement.bk.edgeStraightening': 'ALWAYS',
    'elk.layered.nodePlacement.bk.fixedAlignment': 'TOP',
    'elk.alignment': 'TOP',
    'elk.alg.libavoid.clusterCrossingPenalty': '2',
    'elk.alg.libavoid.crossingPenalty': '1',
  },
});

function createGraphElements(
  graph: Map<AnyAccount, AccountNode>,
  selectedAccountId: string,
  t: TFunction<'translation'>,
) {
  const nodes: Node<AccountNodeData>[] = [];
  const edges: Edge[] = [];
  const processedAccountIds = new Set<string>();
  const accountIdToNodeId = new Map<string, string>();

  function resolveNodeId(account: AnyAccount): string {
    return accountIdToNodeId.get(account.accountId) ?? account.id;
  }

  function processNode(node: AccountNode) {
    if (processedAccountIds.has(node.account.accountId)) return;
    processedAccountIds.add(node.account.accountId);
    accountIdToNodeId.set(node.account.accountId, node.account.id);

    nodes.push({
      id: node.account.id,
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
      const childNodeId = resolveNodeId(child.account);
      const nodeId = node.account.id;
      const connection = accountConnectionTransformer({ source: child.account, target: node.account, t });

      edges.push({
        id: `e${childNodeId}-${nodeId}`,
        source: childNodeId,
        target: nodeId,
        data: {
          source: child.account,
          target: node.account,
        },
        markerEnd: {
          color: connection?.color || '#2A1FD5',
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

const useGraphLayout = (
  graph: Map<AnyAccount, AccountNode> | null,
  selectedAccount: AnyAccount | null,
  setNodes: (nodes: Node<AccountNodeData>[]) => void,
  setEdges: (edges: Edge[]) => void,
  fitView: ReturnType<typeof useReactFlow>['fitView'],
) => {
  const { t } = useI18n();

  return useCallback(async () => {
    if (!graph || !selectedAccount) return;

    const { nodes, edges } = createGraphElements(graph, selectedAccount.accountId, t);

    const layoutGraph = await elk.layout({
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
    });

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

    setNodes(layoutNodes);
    setEdges(edges);

    fitView({
      padding: { top: '75px', bottom: '25px', left: '25px', right: '25px' },
    });
  }, [graph, selectedAccount, setNodes, setEdges, fitView]);
};

const AccountsStructureInner = () => {
  const graph = useUnit(accountsStructureModel.$graph);
  const selectedAccount = useUnit(accountsStructureModel.$selectedAccount);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AccountNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();
  const graphRef = useRef<HTMLDivElement>(null);

  const layoutGraph = useGraphLayout(graph, selectedAccount, setNodes, setEdges, fitView);

  useClickOutside([graphRef], () => accountsStructureModel.releaseAccountNode());

  useEffect(() => {
    if (graphRef.current) {
      const rect = graphRef.current.getBoundingClientRect();
      accountsStructureModel.setCanvasSize({ width: rect.width, height: rect.height });
    }
  }, [graphRef]);

  // Layout graph when graph or selected account changes
  useEffect(() => {
    void layoutGraph();
  }, [layoutGraph]);

  // Layout graph when reset is called
  useEffect(
    () =>
      // eslint-disable-next-line effector/no-watch
      accountsStructureModel.reset.watch(() => layoutGraph()),
    [layoutGraph],
  );

  useEffect(
    () =>
      // eslint-disable-next-line effector/no-watch
      accountsStructureModel.focusOnSelected.watch(() => {
        if (!selectedAccount) return;
        const matchingNode = nodes.find((n) => n.data.node.account.accountId === selectedAccount.accountId);
        if (matchingNode) {
          fitView({ nodes: [{ id: matchingNode.id }], maxZoom: 0.5, duration: 500 });
        }
      }),
    [fitView, selectedAccount, nodes],
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
        onViewportChange={accountsStructureModel.setViewport}
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
