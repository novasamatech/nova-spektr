import { useNavigate } from 'react-router-dom';

import { Paths, createLink } from '@shared/routes';
import { IconButton } from '@shared/ui';
import { Contact } from '@shared/core';

type Props = {
  contactId: Contact['id'];
};
export const EditContactNavigation = ({ contactId }: Props) => {
  const navigate = useNavigate();

  const navigateToEdit = () => {
    navigate(createLink(Paths.EDIT_CONTACT, {}, { id: [contactId] }));
  };

  return <IconButton name="edit" className="m-3 p-2" onClick={navigateToEdit} />;
};
