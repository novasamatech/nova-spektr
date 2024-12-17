import { Listbox, Transition } from '@headlessui/react';
import { Fragment, type ReactNode, useId } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { CaptionText, FootnoteText, Icon, LabelText } from '@/shared/ui';
import {
  OptionStyle,
  OptionStyleTheme,
  OptionsContainerStyle,
  OptionsContainerStyleTheme,
  SelectButtonStyle,
  ViewClass,
} from '@/shared/ui/Dropdowns/common/constants';
import { type DropdownResult, type Position, type Theme } from '@/shared/ui/Dropdowns/common/types';
import { Checkbox } from '@/shared/ui-kit';

type DropdownOption<T = any> = {
  id: string;
  value: T;
  element?: ReactNode;
  group?: { list: DropdownOption[]; groupName: string; groupValue: ReactNode };
  additionalElement?: ReactNode;
  disabled?: boolean;
};

type Props = {
  className?: string;
  placeholder: string;
  multiPlaceholder?: string;
  label?: string;
  disabled?: boolean;
  invalid?: boolean;
  selectedIds?: DropdownOption['id'][];
  options: DropdownOption[];
  position?: Position;
  tabIndex?: number;
  theme?: Theme;
  onChange: (data: DropdownResult[]) => void;
};

export const AccountsMultiSelector = ({
  className,
  placeholder,
  multiPlaceholder,
  label,
  disabled,
  invalid,
  selectedIds = [],
  options,
  tabIndex,
  position = 'down',
  theme = 'light',
  onChange,
}: Props) => {
  const { t } = useI18n();
  const id = useId();

  const optionsFlat = options.reduce<DropdownOption[]>((acc, option) => {
    if (option.group) {
      return [...acc, ...option.group.list];
    }

    return [...acc, option];
  }, []);
  const selectedOptions = optionsFlat.filter((option) => selectedIds?.includes(option.id));

  const toggleAll = (checked: boolean) => {
    if (checked) {
      onChange([...optionsFlat]);
    } else {
      onChange([]);
    }
  };

  const getSelectButtonElement = () => {
    // if one option selected we show that option
    // otherwise we show placeholder and selected options count (if not 0)
    if (selectedOptions.length === 0) {
      return (
        <FootnoteText as="span" className="text-text-secondary">
          {placeholder}
        </FootnoteText>
      );
    }

    if (selectedOptions.length === 1) {
      return (
        <FootnoteText
          as="span"
          className={cnTw(typeof selectedOptions[0].element === 'string' && 'truncate', 'w-full')}
        >
          {selectedOptions[0].element}
        </FootnoteText>
      );
    }

    return (
      <span className="flex items-center gap-x-2">
        <FootnoteText as="span">{multiPlaceholder || placeholder}</FootnoteText>
        <CaptionText as="span" className="h-4 rounded-[30px] bg-icon-accent px-1.5 leading-4 text-white" align="center">
          {selectedOptions.length}
        </CaptionText>
      </span>
    );
  };

  const selectElement = (
    <Listbox multiple by="id" disabled={disabled} value={selectedOptions} onChange={onChange}>
      {({ open }) => (
        <div className={cnTw('relative', className)}>
          <Listbox.Button
            id={id}
            className={cnTw(
              open && SelectButtonStyle[theme].open,
              !open && !invalid && SelectButtonStyle[theme].closed,
              invalid && SelectButtonStyle[theme].invalid,
              SelectButtonStyle[theme].disabled,
              'bg-input-background text-text-primary',
              'rounded border text-footnote outline-offset-1',
              'inline-flex w-full items-center justify-between gap-2 px-2 py-2',
            )}
            tabIndex={tabIndex}
          >
            {getSelectButtonElement()}
            <Icon name={open ? 'up' : 'down'} size={16} />
          </Listbox.Button>

          <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Listbox.Options
              className={cnTw(
                OptionsContainerStyle,
                OptionsContainerStyleTheme[theme],
                position !== 'auto' && ViewClass[position],
              )}
            >
              <li
                key="all"
                className={cnTw(
                  'mb-1 rounded p-2 hover:bg-action-background-hover',
                  OptionStyleTheme[theme](
                    false,
                    optionsFlat.every((option) => selectedIds.includes(option.id)),
                  ),
                )}
              >
                <Checkbox
                  checked={optionsFlat.every((option) => selectedIds.includes(option.id))}
                  semiChecked={optionsFlat.some((option) => selectedIds.includes(option.id))}
                  onChange={(checked) => toggleAll(checked)}
                >
                  <FootnoteText className="text-body text-text-secondary">{t('balances.allAccounts')}</FootnoteText>
                </Checkbox>
              </li>

              {options.map(({ id, value, additionalElement, element, group }) =>
                group ? (
                  <Group
                    key={id}
                    group={group}
                    selectedIds={selectedIds}
                    selectedOptions={selectedOptions}
                    theme={theme}
                    onChange={onChange}
                  />
                ) : (
                  <Listbox.Option
                    key={id}
                    value={{ id, value }}
                    className={({ active, selected }) => cnTw(OptionStyle, OptionStyleTheme[theme](active, selected))}
                  >
                    {({ selected }) => (
                      <div className="flex w-full justify-between gap-x-2">
                        <div
                          className={cnTw(
                            'pointer-events-none w-full pl-4',
                            selected ? 'text-text-primary' : 'text-text-secondary',
                          )}
                        >
                          <Checkbox checked={selected}>{element}</Checkbox>
                        </div>

                        {additionalElement}
                      </div>
                    )}
                  </Listbox.Option>
                ),
              )}
            </Listbox.Options>
          </Transition>
        </div>
      )}
    </Listbox>
  );

  if (!label) {
    return selectElement;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <LabelText className="cursor-pointer text-text-tertiary" htmlFor={id}>
        {label}
      </LabelText>
      {selectElement}
    </div>
  );
};

type PropsGroup = {
  group: {
    list: DropdownOption[];
    groupName: string;
    groupValue: ReactNode;
  };
  selectedIds: DropdownOption['id'][];
  theme: Theme;
  selectedOptions: DropdownOption[];
  onChange: (data: DropdownResult[]) => void;
};

const Group = ({ group, selectedIds, selectedOptions, theme, onChange }: PropsGroup) => {
  const { list, groupName, groupValue } = group;
  const isChecked = list.every(({ id }) => selectedIds.includes(id));

  const toggleGroup = (checked: boolean) => {
    if (checked) {
      const newSelection = list.map(({ id, value }) => ({ id, value }));
      onChange([...selectedOptions, ...newSelection]);
    } else {
      const updatedSelection = selectedOptions.filter(({ id }) => !list.some((item) => item.id === id));
      onChange(updatedSelection);
    }
  };

  return (
    <>
      <div
        className={cnTw(
          'my-1 flex rounded hover:bg-action-background-hover',
          OptionStyleTheme[theme](false, isChecked),
        )}
      >
        <div className="w-full p-2 pl-6">
          <Checkbox
            checked={isChecked}
            semiChecked={list.some(({ id }) => selectedIds.includes(id))}
            onChange={(checked) => toggleGroup(checked)}
          >
            <div className="flex h-5 w-7.5 items-center justify-center rounded-2lg bg-input-background-disabled">
              <CaptionText className="text-text-secondary">{list.length}</CaptionText>
            </div>
            <FootnoteText className="flex-1 text-text-tertiary">{groupName}</FootnoteText>
            <FootnoteText className="text-text-secondary">{groupValue}</FootnoteText>
          </Checkbox>
        </div>
      </div>
      <ul>
        {list.map(({ id, value, additionalElement, element }) => (
          <Listbox.Option
            key={id}
            value={{ id, value }}
            className={({ active, selected }) => cnTw(OptionStyle, OptionStyleTheme[theme](active, selected), 'my-1')}
          >
            {({ selected }) => (
              <div className="flex w-full items-center justify-between gap-x-4">
                <div
                  className={cnTw(
                    'pointer-events-none w-full pl-8',
                    selected ? 'text-text-primary' : 'text-text-secondary',
                  )}
                >
                  <Checkbox checked={selected}>{element}</Checkbox>
                </div>
                {additionalElement}
              </div>
            )}
          </Listbox.Option>
        ))}
      </ul>
    </>
  );
};
