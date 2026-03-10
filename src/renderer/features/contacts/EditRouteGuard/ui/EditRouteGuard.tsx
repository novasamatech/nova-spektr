import { useUnit } from 'effector-react';
import { type ReactNode, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { type Contact } from '@/shared/core';
import { contactModel } from '@/entities/contact';

type Props = {
  redirectPath: string;
  children?: ReactNode | ((contact: Contact) => ReactNode);
};
export const EditRouteGuard = ({ redirectPath, children }: Props) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contacts = useUnit(contactModel.$contacts);

  const contactId = searchParams.get('id');
  const contact = useMemo(() => contacts.find((c) => c.id === contactId) ?? null, [contacts, contactId]);

  useEffect(() => {
    if (!contactId || (contacts.length > 0 && !contact)) {
      navigate(redirectPath, { replace: true });
    }
  }, [contact, contactId, contacts.length, navigate, redirectPath]);

  if (!contact) {
    return null;
  }

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{typeof children === 'function' ? children(contact) : children}</>;
};
