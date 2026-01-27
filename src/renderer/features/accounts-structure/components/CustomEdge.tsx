import {
  type EdgeProps,
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
} from '@xyflow/react';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { AsyncItem } from '@/shared/ui-kit';
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
  const viewport = useUnit(accountsStructureModel.$viewport);
  const canvasSize = useUnit(accountsStructureModel.$canvasSize);

  const isOutsideViewport = useMemo(() => {
    // Transform source and target coordinates to screen coordinates
    const sourceScreenX = sourceX * viewport.zoom + viewport.x;
    const sourceScreenY = sourceY * viewport.zoom + viewport.y;
    const targetScreenX = targetX * viewport.zoom + viewport.x;
    const targetScreenY = targetY * viewport.zoom + viewport.y;

    // Check if both source and target are outside viewport using canvas dimensions
    return (
      (sourceScreenX < 0 && targetScreenX < 0) ||
      (sourceScreenY < 0 && targetScreenY < 0) ||
      (sourceScreenX > canvasSize.width && targetScreenX > canvasSize.width) ||
      (sourceScreenY > canvasSize.height && targetScreenY > canvasSize.height)
    );
  }, [sourceX, sourceY, targetX, targetY, viewport, canvasSize]);

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
  const labels = connection?.labels;
  const connectionColor = connection?.color || '#363643';

  const shouldFade = highlightedNodesIds
    ? !highlightedNodesIds.has(sourceAccount.id) || !highlightedNodesIds.has(targetAccount.id)
    : false;

  return isOutsideViewport ? null : (
    <AsyncItem>
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

      {labels && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              opacity: shouldFade ? 0 : 1,
              transition: 'opacity 300ms',
            }}
          >
            {labels.map((label, index) => (
              <div
                key={`${label.text}-${index}`}
                style={{
                  padding: '3px 6px',
                  fontSize: '10px',
                  lineHeight: '12px',
                  fontWeight: '600',
                  color: label.color,
                  borderRadius: '26px',
                  border: '2px solid #F9F9F9',
                  background: label.background,
                  textTransform: 'uppercase',
                }}
              >
                {label.text}
              </div>
            ))}
          </div>
        </EdgeLabelRenderer>
      )}
    </AsyncItem>
  );
};
