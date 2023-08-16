import { useEffect, useState } from 'react';

import { getDataURL } from './utils';

const useTextGenerator = (payload: string, bgColor: string): string | null => {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    getDataURL(payload, bgColor).then(setImage);
  }, [payload, bgColor]);

  return image;
};

export default useTextGenerator;
