import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, Icon, type IconNames } from '@/shared/ui';

export type Props = {
  order?: number;
  title: string;
  link: string;
  icon: IconNames | ReactNode;
  badge?: ReactNode;
};

export const NavItem = ({ title, link, icon, badge }: Props) => {
  const { t } = useI18n();

  return (
    <NavLink
      to={link}
      className={({ isActive }) =>
        cnTw(
          'flex cursor-pointer items-center rounded-md px-3.5 py-2.5 outline-offset-reduced select-none hover:bg-tab-background',
          isActive && 'bg-tab-background',
        )
      }
    >
      {({ isActive }) => (
        <>
          {typeof icon === 'string' ? (
            <Icon
              className={cnTw(isActive ? 'text-tab-icon-active' : 'text-tab-icon-inactive')}
              name={icon as IconNames}
              size={20}
            />
          ) : (
            <span
              className={cnTw(
                'h-5 w-5 shrink-0 overflow-hidden',
                isActive ? 'text-tab-icon-active' : 'text-tab-icon-inactive',
              )}
            >
              {icon}
            </span>
          )}
          <BodyText className={cnTw('ml-3', isActive ? 'text-text-primary' : 'text-text-secondary')}>
            {t(title)}
          </BodyText>
          {badge}
        </>
      )}
    </NavLink>
  );
};
