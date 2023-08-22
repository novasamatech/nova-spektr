import { useNavigate } from 'react-router-dom';

import { createLink, Paths } from '@renderer/app/providers';
import { ButtonIcon } from '@renderer/shared/ui';

type Props = {
  contactId: string;
};
export const EditContactNavigation = ({ contactId }: Props) => {
  const navigate = useNavigate();

  const navigateToEdit = () => {
    navigate(createLink(Paths.EDIT_CONTACT, {}, { id: [contactId] }));
  };

  return <ButtonIcon size="md" icon="edit" className="m-3" onClick={navigateToEdit} />;
};
