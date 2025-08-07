import { stringToU8a } from '@polkadot/util';

import { QrCode, Skeleton } from '@/shared/ui-kit';

type Props = {
  payload?: string;
  size?: string;
  bgColor?: string;
  qrColor?: string;
  className?: string;
  testId?: string;
};

export const QrTextGenerator = ({ payload, size = '240px', qrColor, bgColor, className, testId }: Props) => {
  if (!payload) {
    return <Skeleton height={size} width={size} />;
  }

  const frame = stringToU8a(payload);

  return (
    <QrCode payload={frame} size={size} bgColor={bgColor} qrColor={qrColor} className={className} testId={testId} />
  );
};
