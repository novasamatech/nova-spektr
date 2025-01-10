import { useEffect, useState } from 'react';

export const useExternalState = <T>(external: T | undefined, onChange?: (value: T) => unknown) => {
  const [local, setLocal] = useState(external);

  useEffect(() => {
    if (external !== undefined) {
      setLocal(external);
    }
  }, [external]);

  useEffect(() => {
    if (local !== undefined && local !== external) {
      setLocal(local);
      onChange?.(local);
    }
  }, [local]);

  return [local, setLocal] as const;
};
