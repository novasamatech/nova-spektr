import { useNavigate } from 'react-router-dom';

import { createLink, Paths } from '@renderer/app/providers';
import { IconButton } from '@renderer/shared/ui';

type Props = {
  contactId: string;
};
export const EditContactNavigation = ({ contactId }: Props) => {
  const navigate = useNavigate();

  const navigateToEdit = () => {
    navigate(createLink(Paths.EDIT_CONTACT, {}, { id: [contactId] }));
  };

  return <IconButton size={16} name="edit" className="m-3" onClick={navigateToEdit} />;
};
