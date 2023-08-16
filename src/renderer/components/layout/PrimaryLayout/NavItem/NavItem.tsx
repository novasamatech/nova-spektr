import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { Icon, BodyText } from '@renderer/shared/ui';
import { IconNames } from '@renderer/shared/ui/types';
import { useI18n } from '@renderer/app/providers';
import { cnTw } from '@renderer/shared/lib/utils';

export type Props = {
  title: string;
  link: string;
  icon: IconNames;
  badge?: ReactNode;
};

const NavItem = ({ title, link, icon, badge }: Props) => {
  const { t } = useI18n();

  return (
    <NavLink
      to={link}
      className={({ isActive }) =>
        cnTw(
          'flex items-center px-3.5 py-2.5 outline-offset-reduced cursor-pointer select-none rounded-md hover:bg-tab-background',
          isActive && 'bg-tab-background',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cnTw(isActive ? 'text-tab-icon-active' : 'text-tab-icon-inactive')} name={icon} size={20} />
          <BodyText className={cnTw('ml-3', isActive ? 'text-text-primary' : 'text-text-secondary')}>
            {t(title)}
          </BodyText>
          {!!badge && <BodyText className="ml-auto text-text-tertiary">{badge}</BodyText>}
        </>
      )}
    </NavLink>
  );
};

export default NavItem;
