import { useUnit } from 'effector-react';
import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { type IconNames, BodyText, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { sidebarModel } from '../model/sidebar-model';

export type Props = {
  order?: number;
  title: string;
  link: string;
  icon: IconNames | ReactNode;
  badge?: ReactNode;
  iconBadge?: ReactNode;
  trailingAction?: ReactNode;
};

export const NavItem = ({ title, link, icon, badge, iconBadge, trailingAction }: Props) => {
  const { t } = useI18n();
  const folded = useUnit(sidebarModel.$folded);

  const translatedTitle = t(title);

  return (
    <Tooltip side="right" open={folded ? undefined : false}>
      <Tooltip.Trigger>
        <div className="relative">
          <NavLink
            to={link}
            className={({ isActive }) =>
              cnTw(
                'flex cursor-pointer items-center rounded-md px-3.5 py-2.5 outline-offset-reduced transition-all duration-200 select-none hover:bg-tab-background',
                isActive && 'bg-tab-background',
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative shrink-0">
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
                  {iconBadge}
                  {folded && badge && (
                    <span className="absolute -top-0.5 -right-1.5 h-1.5 w-1.5 rounded-full bg-icon-accent" />
                  )}
                </div>
                <BodyText
                  className={cnTw(
                    'overflow-hidden whitespace-nowrap transition-all duration-200',
                    folded ? 'ml-0 max-w-0 opacity-0' : 'ml-3 max-w-[180px] opacity-100',
                    isActive ? 'text-text-primary' : 'text-text-secondary',
                  )}
                >
                  {translatedTitle}
                </BodyText>
                <div
                  className={cnTw(
                    'ml-auto overflow-hidden transition-all duration-200',
                    folded ? 'max-w-0 opacity-0' : 'max-w-[100px] opacity-100',
                  )}
                >
                  {badge}
                </div>
              </>
            )}
          </NavLink>
          {trailingAction ? (
            <div
              aria-hidden={folded}
              inert={folded || undefined}
              className={cnTw(
                'absolute top-1/2 right-2 -translate-y-1/2 transition-opacity duration-200',
                folded ? 'opacity-0' : 'opacity-100',
              )}
            >
              {trailingAction}
            </div>
          ) : null}
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>{translatedTitle}</Tooltip.Content>
    </Tooltip>
  );
};
