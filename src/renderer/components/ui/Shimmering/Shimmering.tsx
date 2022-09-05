import './shimmering.css';

type Props = {
  width?: string;
  height?: string;
};

const Shimmering = ({ width = 'auto', height = 'auto' }: Props) => {
  return <div className="h-full w-full rounded-lg shimmer" style={{ width, height }} />;
};

export default Shimmering;
