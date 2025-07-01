import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  Position,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
} from '@xyflow/react';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { type AnyAccount } from '@/domains/network';
import { accountConnectionTransformer } from '@/sdk/account';
import { accountsStructureModel } from '../model/accountsStructureModel';

export const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  style = {},
  markerStart,
  markerEnd,
  data,
  interactionWidth,
}: EdgeProps) => {
  const { t } = useI18n();
  const pathType = useUnit(accountsStructureModel.$pathType);
  const edgeType = useUnit(accountsStructureModel.$edgeType);
  const highlightedNodesIds = useUnit(accountsStructureModel.$highlightedNodesIds);

  if (!data) return null;

  const sourceAccount = data.source as AnyAccount;
  const targetAccount = data.target as AnyAccount;

  const [edgePath, labelX, labelY] = useMemo(() => {
    switch (pathType) {
      case 'straight':
        return getStraightPath({ sourceX, sourceY, targetX, targetY });
      case 'bezier':
        return getBezierPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
        });
      default:
        return getSmoothStepPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
          borderRadius: 50,
        });
    }
  }, [pathType, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition]);

  const connection =
    data && useTransformer(accountConnectionTransformer, { source: sourceAccount, target: targetAccount, t });
  const label = connection?.label;
  const connectionColor = connection?.color || '#363643';

  const shouldFade = highlightedNodesIds
    ? !highlightedNodesIds.has(sourceAccount.accountId) || !highlightedNodesIds.has(targetAccount.accountId)
    : false;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={markerStart}
        markerEnd={markerEnd}
        interactionWidth={interactionWidth}
        style={{
          ...style,
          stroke: connectionColor,
          strokeWidth: 2,
          strokeDasharray: edgeType === 'dashed' ? '6 6' : undefined,
          opacity: shouldFade ? 0.1 : 1,
          transition: 'opacity 300ms',
        }}
      />

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              padding: '5px 10px',
              fontSize: '10px',
              fontWeight: '600',
              color: label.color,
              borderRadius: '26px',
              border: '2px solid #F9F9F9',
              background: label.background,
              textTransform: 'uppercase',
              opacity: shouldFade ? 0 : 1,
              transition: 'opacity 300ms',
            }}
          >
            {label.text}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
