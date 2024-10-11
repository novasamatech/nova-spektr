type BaseHTMLInputProps = 'value' | 'required' | 'disabled' | 'placeholder' | 'name' | 'className' | 'autoFocus';

export type HTMLInputProps = BaseHTMLInputProps | 'type' | 'tabIndex' | 'spellCheck';

export type HTMLTextAreaProps = BaseHTMLInputProps | 'rows' | 'maxLength' | 'spellCheck';

export type HTMLInputFileProps = HTMLInputProps | 'accept';
