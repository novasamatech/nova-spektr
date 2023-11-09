import { ReactNode, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from 'effector-react';

import * as editGuardModel from '../model/edit-guard';
import type { Contact } from '@renderer/shared/core';

type Props = {
  redirectPath: string;
  children?: ReactNode | ((contact: Contact) => ReactNode);
};
export const EditRouteGuard = ({ redirectPath, children }: Props) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const contact = useStore(editGuardModel.$contact);

  useEffect(() => {
    editGuardModel.events.navigateApiChanged({ navigate, redirectPath });
    editGuardModel.events.validateUrlParams(searchParams);

    return () => {
      editGuardModel.events.storeCleared();
    };
  }, [searchParams]);

  if (!contact) return null;

  return <>{typeof children === 'function' ? children(contact) : children}</>;
};
