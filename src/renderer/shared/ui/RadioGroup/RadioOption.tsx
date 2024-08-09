import { RadioGroup as HeadlessRadioGroup } from '@headlessui/react';
import { Fragment, type PropsWithChildren } from 'react';

import { cnTw } from '@shared/lib/utils';
import { SmallTitleText } from '../Typography';

import { type RadioOption } from './common/types';
import './RadioGroup.css';

type Props = {
  option: RadioOption;
};

export const Option = ({ option, children }: PropsWithChildren<Props>) => {
  const { id, value, title } = option;

  // Not using ui-active, because when Option is checked and child is another headless-ui component (like Dropdown)
  // it makes all dropdown items seem to be selected as well (pure CSS issue)
  return (
    <HeadlessRadioGroup.Option value={{ id, value }} as={Fragment}>
      {({ checked }) => (
        <div
          className={cnTw(
            'mb-2 cursor-pointer rounded border border-filter-border last:mb-0',
            checked && 'border-active-container-border',
          )}
        >
          <div
            className={cnTw(
              'flex cursor-pointer items-center justify-between p-3 transition hover:bg-hover focus:bg-hover',
              checked ? 'bg-hover' : 'bg-tab-background',
            )}
          >
            <SmallTitleText as="p" className={cnTw('text-button-large', checked && 'text-action-text')}>
              {title}
            </SmallTitleText>
            <span
              className={cnTw(
                'relative h-4 w-4 rounded-full border border-filter-border bg-card-background',
                checked ? 'spektr-radio border-0 bg-primary-button-background-default' : 'border-filter-border',
              )}
            />
          </div>
          {children && <div className="p-3">{children}</div>}
        </div>
      )}
    </HeadlessRadioGroup.Option>
  );
};
