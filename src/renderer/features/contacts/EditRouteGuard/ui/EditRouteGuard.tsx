import { useUnit } from 'effector-react';
import { type ReactNode, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { type Contact } from '@shared/core';
import * as editGuardModel from '../model/edit-guard';

type Props = {
  redirectPath: string;
  children?: ReactNode | ((contact: Contact) => ReactNode);
};
export const EditRouteGuard = ({ redirectPath, children }: Props) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const contact = useUnit(editGuardModel.$contact);

  useEffect(() => {
    editGuardModel.events.navigateApiChanged({ navigate, redirectPath });
    editGuardModel.events.validateUrlParams(searchParams);

    return () => {
      editGuardModel.events.storeCleared();
    };
  }, [searchParams]);

  if (!contact) {
    return null;
  }

  return <>{typeof children === 'function' ? children(contact) : children}</>;
};
