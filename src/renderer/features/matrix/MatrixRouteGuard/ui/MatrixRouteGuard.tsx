import { ReactNode } from 'react';

import { useMatrix } from '@renderer/app/providers';

type Props = {
  children: (isLoggedIn: boolean) => ReactNode;
};
export const MatrixRouteGuard = ({ children }: Props) => {
  const { isLoggedIn } = useMatrix();

  return <>{children(isLoggedIn)}</>;
};
