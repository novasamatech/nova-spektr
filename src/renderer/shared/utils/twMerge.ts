import { twMerge } from 'tailwind-merge';
import cn from 'classnames';

type CnArgs = Parameters<typeof cn>;
const cnTw = (...args: CnArgs) => twMerge(cn(args));
export default cnTw;
