import { type FC } from 'react';
import ReactMarkdown, { type Components, type Options } from 'react-markdown';
import rehypeRaw from 'rehype-raw';

import { BodyText, LargeTitleText, HeadlineText, HeaderTitleText, InfoLink } from '@shared/ui';

const rehypeOptions: Options['remarkRehypeOptions'] = { allowDangerousHtml: true };
const rehypePlugins: Options['rehypePlugins'] = [rehypeRaw];

const components: Components = {
  h1: (props) => <LargeTitleText as="h1" className="mt-4 pb-2 border-b border-container-border" {...props} />,
  h2: (props) => <HeaderTitleText as="h2" className="mt-2 pb-2 border-b border-container-border" {...props} />,
  h3: (props) => <HeadlineText as="h3" className="mt-1" {...props} />,
  ul: ({ node, ...props }) => (
    <ul className="appearance-none flex flex-col gap-0.5 ml-[2ch] list-outside list-disc" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ul className="appearance-none flex flex-col gap-0.5 ml-[2ch] list-outside list-decimal" {...props} />
  ),
  a: ({ node, ...props }) => (
    <InfoLink
      className="text-primary-button-background-default hover:underline focus:w-full"
      url={props.href ?? ''}
      size="inherit"
    >
      {props.children}
    </InfoLink>
  ),
  p: (props) => <BodyText as="p" {...props} />,
  img: ({ node, ...props }) => (
    <div className="w-full flex justify-center my-2">
      <img className="max-w-full" {...props} />
    </div>
  ),
};

export const Markdown: FC<{ children: string }> = ({ children }) => {
  return (
    <ReactMarkdown
      className="flex flex-col gap-3 text-body whitespace-pre-line"
      remarkRehypeOptions={rehypeOptions}
      rehypePlugins={rehypePlugins}
      components={components}
    >
      {children}
    </ReactMarkdown>
  );
};
