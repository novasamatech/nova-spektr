import { PropsWithChildren, forwardRef, ElementType, ReactNode } from 'react';

import { Accordion, CaptionText, FootnoteText } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';
import { IconNames } from '../Icon/data';

type Props = {
  className?: string;
  isDefaultOpen?: boolean;
};

const Token = ({ ...props }: PropsWithChildren<Props>) => {
  return <Accordion {...props} />;
};

type ButtonProps = {
  description?: ReactNode;
  buttonClass?: string;
  iconWrapper?: string;
  iconOpened?: IconNames;
  iconClosed?: IconNames;
  onClick?: () => void;
};

const Button = forwardRef<HTMLButtonElement, PropsWithChildren<ButtonProps>>(
  ({ buttonClass, children, description, ...props }, ref) => {
    return (
      <Accordion.Button buttonClass={cnTw('p-2', buttonClass)}>
        <div className="flex justify-between items-center">
          <FootnoteText>{children}</FootnoteText>
          {description && <CaptionText className="text-text-tertiary">{description}</CaptionText>}
        </div>
      </Accordion.Button>
    );
  },
);

type ContentProps = {
  as?: ElementType;
  className?: string;
};

const Content = ({ ...props }: PropsWithChildren<ContentProps>) => {
  return <Accordion.Content {...props} />;
};

Token.Button = Button;
Token.Content = Content;

export default Token;
