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
  const pathType = useUnit(accountsStructureModel.$pathType);
  const edgeType = useUnit(accountsStructureModel.$edgeType);

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
    data &&
    useTransformer(accountConnectionTransformer, {
      source: data.source as AnyAccount,
      target: data.target as AnyAccount,
    });

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
          stroke: '#363643',
          strokeWidth: 2,
          strokeDasharray: edgeType === 'dashed' ? '6 6' : undefined,
        }}
      />

      {connection && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              padding: '5px 10px',
              fontSize: '10px',
              fontWeight: '600',
              color: connection.textColor,
              borderRadius: '26px',
              border: '2px solid #F9F9F9',
              background: connection.backgroundColor,
              textTransform: 'uppercase',
            }}
          >
            {connection.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
