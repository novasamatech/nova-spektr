import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  Position,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
} from '@xyflow/react';

import { useTransformer } from '@/shared/di';
import { type AnyAccount } from '@/domains/network';
import { accountConnectionTransformer } from '@/sdk/account';

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
  const pathType = data?.pathType as string;
  let edgePath, labelX, labelY;

  switch (pathType) {
    case 'straight':
      [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
      break;
    case 'bezier':
      [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });
      break;
    default:
      [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 50,
      });
  }

  const connection =
    data &&
    useTransformer(accountConnectionTransformer, {
      source: data.source as AnyAccount,
      target: data.target as AnyAccount,
    });
  const edgeType = data?.edgeType as 'solid' | 'dashed' | undefined;

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
