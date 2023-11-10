import { useNavigate } from 'react-router-dom';

import { Paths, createLink } from '@renderer/shared/routes';
import { IconButton } from '@renderer/shared/ui';
import { Contact } from '@renderer/shared/core';

type Props = {
  contactId: Contact['id'];
};
export const EditContactNavigation = ({ contactId }: Props) => {
  const navigate = useNavigate();

  const navigateToEdit = () => {
    navigate(createLink(Paths.EDIT_CONTACT, {}, { id: [contactId] }));
  };

  return <IconButton size={16} name="edit" className="m-3" onClick={navigateToEdit} />;
};
