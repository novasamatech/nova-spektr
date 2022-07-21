import cn from 'classnames';

const mock = [
  { token: 'DOT', value: -5.79 },
  { token: 'KSM', value: -2.49 },
  { token: 'ACA', value: 1.05 },
];

const Footer = () => {
  return (
    <footer className="flex justify-between items-center px-5 py-2.5 rounded-t-lg shadow-1 bg-white">
      <ul className="flex gap-x-2.5 mr-3 h-max">
        {mock.map(({ token, value }) => (
          <li
            key={token}
            className="text-xs text-gray-600 font-semibold pr-2.5 border-r border-gray-300 last:pr-0 last:border-0"
          >
            <span className="mr-1.5">{token}</span>
            <span className={cn(value < 0 ? 'text-red-500' : 'text-green-300')}>
              {value < 0 ? value : `+${value}`}%
            </span>
          </li>
        ))}
      </ul>
      <div className="flex gap-x-2.5">
        <div>1</div>
        <div>2</div>
        <div>3</div>
      </div>
    </footer>
  );
};

export default Footer;
