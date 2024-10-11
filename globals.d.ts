declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

declare module '*.webm' {
  const content: string;
  export default content;
}

declare module '*.mp4' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  import { type FC, type SVGProps } from 'react';
  export const ReactComponent: FC<SVGProps<SVGSVGElement>>;
  const content: string;
  export default content;
}

declare module 'units-css' {
  const content: any;
  export default content;
}
