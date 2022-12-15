import './shimmering.css';

type Props = {
  width?: number;
  height?: number;
};

const Shimmering = ({ width, height }: Props) => {
  return <div className="h-full w-full rounded-md shimmer" style={{ width: `${width}px`, height: `${height}px` }} />;
};

export default Shimmering;
