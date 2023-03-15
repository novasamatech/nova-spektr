import cn from 'classnames';
import { ReactNode, useState, ChangeEvent, ComponentPropsWithRef } from 'react';

import { HTMLInputProps } from '../common/types';

type FileInputProps = HTMLInputProps | 'accept';
interface Props extends Pick<ComponentPropsWithRef<'input'>, FileInputProps> {
  label?: ReactNode;
  disabledStyle?: boolean;
  invalid?: boolean;
  wrapperClass?: string;
  prefixElement?: ReactNode;
  suffixElement?: ReactNode;
  onChange?: (file: File) => void;
}

const InputFile = ({
  ref,
  label = '',
  placeholder,
  disabledStyle,
  className,
  wrapperClass,
  invalid = false,
  prefixElement,
  suffixElement,
  onChange,
  ...props
}: Props) => {
  const [fileName, setFileName] = useState('');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files || !files.length) return;
    if (files[0].type !== props.accept) return;

    onChange?.(files[0]);
    setFileName(files[0].name);
  };

  return (
    <label
      className={cn(
        'relative flex items-center rounded-2lg p-2 box-border border-2',
        'text-sm font-normal leading-5 focus-within:border-primary',
        invalid ? 'border-error' : 'border-shade-2',
        label && 'rounded-2lg text-lg px-2.5 pb-0 pt-5',
        disabledStyle ? 'bg-white' : 'bg-shade-2',
        wrapperClass,
      )}
    >
      {prefixElement}
      {label && (
        <div className="absolute top-2.5 font-bold text-neutral-variant uppercase text-2xs w-full pr-5">{label}</div>
      )}
      {fileName ? (
        <span className={cn('w-full truncate', invalid ? 'text-error' : 'text-primary')}>{fileName}</span>
      ) : (
        <span className="text-shade-30 w-full">{placeholder}</span>
      )}
      <input
        className={cn(
          'rounded-sm leading-5 bg-transparent flex-1 placeholder-shade-30 focus:outline-none focus:text-primary',
          disabledStyle ? 'text-shade-40' : 'text-neutral',
          invalid && 'text-error',
          label && 'py-1 my-4',
          prefixElement && 'ml-2',
          suffixElement && 'mr-2',
          className,
        )}
        data-testid="file-input"
        type="file"
        ref={ref}
        onChange={handleFileChange}
        {...props}
      />
      {suffixElement}
    </label>
  );
};

export default InputFile;
