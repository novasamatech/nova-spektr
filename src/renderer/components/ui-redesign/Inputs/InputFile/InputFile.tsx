import { useState, ChangeEvent, ComponentPropsWithoutRef, forwardRef } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import { HTMLInputFileProps } from '../common/types';
import { Icon } from '@renderer/components/ui';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';
import { FootnoteText } from '@renderer/components/ui-redesign';

interface Props extends Pick<ComponentPropsWithoutRef<'input'>, HTMLInputFileProps> {
  invalid?: boolean;
  onChange?: (file: File) => void;
}

const InputFile = forwardRef<HTMLInputElement, Props>(
  ({ placeholder, className, invalid = false, onChange, ...props }, ref) => {
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
        className={cnTw(
          'h-full p-3 cursor-pointer flex items-center justify-center rounded border border-dashed border-filter-border active:border-active-container-border',
          invalid && 'border-filter-border-negative',
          className,
        )}
      >
        <div className="flex flex-col items-center gap-y-2">
          <Icon name={invalid ? 'refresh' : 'uploadFile'} className="text-icon-default" />
          {fileName ? (
            <FootnoteText>{fileName}</FootnoteText>
          ) : (
            <TextBase className="text-button-small text-primary-button-background-default">{placeholder}</TextBase>
          )}
        </div>
        <input
          className="hidden"
          data-testid="file-input"
          spellCheck="false"
          type="file"
          ref={ref}
          onChange={handleFileChange}
          {...props}
        />
      </label>
    );
  },
);

export default InputFile;
