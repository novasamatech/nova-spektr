import { NavLink } from 'react-router-dom';

import { Icon } from '@renderer/components/ui';
import { BodyText } from '@renderer/components/ui-redesign';
import { IconNames } from '@renderer/components/ui/Icon/data';
import { useI18n } from '@renderer/context/I18nContext';
import cnTw from '@renderer/shared/utils/twMerge';

export type Props = {
  title: string;
  link: string;
  icon: IconNames;
  badge?: string;
};

const NavItem = ({ title, link, icon, badge }: Props) => {
  const { t } = useI18n();

  return (
    <NavLink
      to={link}
      className={({ isActive }) =>
        cnTw(
          'flex items-center px-3.5 py-2 outline-offset-reduced cursor-pointer select-none rounded-md hover:bg-tab-background',
          isActive && 'bg-tab-background',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cnTw(isActive ? 'text-tab-icon-active' : 'text-tab-icon-inactive')} name={icon} />
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
