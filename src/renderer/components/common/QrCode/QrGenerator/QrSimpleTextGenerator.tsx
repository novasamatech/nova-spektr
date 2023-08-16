import useTextGenerator from './common/useTextGenerator';

type Props = {
  size?: number;
  bgColor?: string;
  payload: string;
  className?: string;
};

const QrSimpleTextGenerator = ({ payload, size, bgColor = 'none', className }: Props) => {
  const image = useTextGenerator(payload, bgColor);

  if (!payload || !image) {
    return null;
  }

  return <img src={image} style={{ width: size, height: size }} className={className} />;
};

export default QrSimpleTextGenerator;
