import React from 'react';

import './shimmering.css';

type Props = {
  width?: string;
  height?: string;
};

const Shimmering: React.FC<Props> = ({ width = 'auto', height = 'auto' }) => {
  return <div className="h-full w-full rounded-lg shimmer" style={{ width, height }} />;
};

export default Shimmering;
