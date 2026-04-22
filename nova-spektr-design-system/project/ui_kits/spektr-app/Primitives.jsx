// Nova Spektr — shared primitives (v2 — based on real screenshots)

const NSIcon = ({ src, size = 16, style, className }) => (
  <img src={src} className={className} style={{ width: size, height: size, display: 'inline-block', flexShrink: 0, ...style }} />
);

// Colorful circular token / chain icon (SVG-based, deterministic from symbol)
const TOKEN_COLORS = {
  DOT: '#E6007A', KSM: '#000000', USDT: '#26A17B', USDC: '#2775CA',
  ASTR: '#1B6DC1', ACA: '#645AFF', GLMR: '#53CBC8', BNC: '#5ACDFE',
  AVAIL: '#2EE5B9', MYTH: '#FF3B87', HDX: '#F653A2', DED: '#F7931A',
  vDOT: '#DB0B77', AAVE: '#B6509E', kBTC: '#F7931A',
};
const tokenColor = (sym) => TOKEN_COLORS[sym] || '#6C6C7A';

const TOKEN_FILE = { DOT:'DOT', KSM:'KSM', USDT:'USDT', USDC:'USDC', ASTR:'ASTR', BNC:'BNC', AAVE:'AAVE', kBTC:'kBTC', HDX:'HDX', MYTH:'MYTH' };
const TokenIcon = ({ symbol, size = 28 }) => {
  const [failed, setFailed] = React.useState(false);
  const file = TOKEN_FILE[symbol];
  if (file && !failed) {
    return <img src={`tokens/${file}.svg`} onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'block' }} />;
  }
  const color = tokenColor(symbol);
  const initials = symbol.length <= 4 ? symbol.slice(0, 4) : symbol.slice(0, 3);
  const fontSize = initials.length >= 4 ? size * 0.28 : size * 0.34;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      font: `700 ${fontSize}px Manrope, system-ui`, letterSpacing: '-.02em',
      flexShrink: 0,
      boxShadow: 'inset 0 0 0 .5px rgba(0,0,0,.12), 0 1px 2px rgba(0,0,0,.06)',
    }}>{initials}</div>
  );
};

const CHAIN_FILE = {
  Polkadot: 'Polkadot', Kusama: 'Kusama',
  'Polkadot Asset Hub': 'Polkadot_Asset_Hub', 'Kusama Asset Hub': 'Kusama_Asset_Hub',
  Mythos: 'Mythos', Astar: 'Astar', Hydration: 'Hydration',
  'Bifrost Polkadot': 'Bifrost_Polkadot', 'Polkadot Collectives': 'Polkadot_Collectives',
};
const ChainIcon = ({ chain, size = 18 }) => {
  const [failed, setFailed] = React.useState(false);
  const file = CHAIN_FILE[chain];
  if (file && !failed) return <img src={`chains/${file}.svg`} onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'block' }} />;
  return <div style={{ width: size, height: size, borderRadius: '50%', background: '#E6007A', flexShrink: 0 }} />;
};

// Chain badge — small solid dot-icon (for "networks" row under token)
const ChainDot = ({ color, size = 14, border = '#fff' }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: color, boxShadow: `0 0 0 1.5px ${border}`,
    flexShrink: 0,
  }} />
);

const ChainList = ({ chains, visible = 4 }) => {
  const shown = chains.slice(0, visible);
  const extra = chains.length - shown.length;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      {shown.map((c, i) => (
        <div key={c} style={{ marginLeft: i === 0 ? 0 : -4, zIndex: shown.length - i }}>
          <ChainDot color={tokenColor(c)} />
        </div>
      ))}
      {extra > 0 && (
        <div style={{
          marginLeft: -4, height: 14, padding: '0 5px', borderRadius: 999,
          background: '#F0F0F3', color: '#79797D',
          font: '600 9px Inter, system-ui', letterSpacing: '.25px',
          display: 'inline-flex', alignItems: 'center',
          boxShadow: '0 0 0 1.5px #fff',
        }}>+{extra}</div>
      )}
    </div>
  );
};

// Polkadot-style identicon — 19 colored circles arranged in a hex grid.
// Colors derived deterministically from the seed bytes.
const POLKA_PALETTE = [
  '#D92A22', '#E0492C', '#E96B33', '#F4993A', '#FAC43F',
  '#F2D13D', '#CDC23B', '#89C43A', '#3FA747', '#398B66',
  '#33784D', '#307C8E', '#346EA1', '#3E5FB3', '#4642B6',
  '#5C34A9', '#7A2A9A', '#99278A', '#BA1F7D', '#D4146A',
];
// 19 positions on a -40..40 canvas: center + inner/middle/outer hex rings.
const POLKA_POS = (() => {
  const out = [[0, 0]];
  for (let i = 0; i < 6; i++) {
    const a = ((i * 60 + 30) * Math.PI) / 180;
    out.push([Math.cos(a) * 11, Math.sin(a) * 11]);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 * Math.PI) / 180;
    out.push([Math.cos(a) * 22, Math.sin(a) * 22]);
  }
  for (let i = 0; i < 6; i++) {
    const a = ((i * 60 + 30) * Math.PI) / 180;
    out.push([Math.cos(a) * 33, Math.sin(a) * 33]);
  }
  return out;
})();

// Deterministic 32-byte "hash" from an arbitrary seed string.
const identiconBytes = (seed) => {
  const s = String(seed || 'a');
  let a = 5381;
  for (let i = 0; i < s.length; i++) a = ((a << 5) + a) ^ s.charCodeAt(i);
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    a = (Math.imul(a, 1664525) + 1013904223) | 0;
    bytes[i] = (a >>> (i % 24)) & 0xff;
  }
  return bytes;
};

const Identicon = ({ seed = 'a', size = 32 }) => {
  const bytes = identiconBytes(seed);
  const paletteRot = bytes[0] % POLKA_PALETTE.length;
  const pick = (byteIdx) => POLKA_PALETTE[(bytes[byteIdx % 32] + paletteRot) % POLKA_PALETTE.length];

  // 3-fold rotational symmetry: each ring has 2 alternating colors across 6 slots.
  const center = pick(1);
  const innerA = pick(3);  const innerB = pick(5);
  const midA   = pick(7);  const midB   = pick(11);
  const outerA = pick(13); const outerB = pick(17);

  const slotColors = new Array(19);
  slotColors[0] = center;
  for (let i = 0; i < 6; i++) slotColors[1 + i]  = (i % 2 === 0) ? innerA : innerB;
  for (let i = 0; i < 6; i++) slotColors[7 + i]  = (i % 2 === 0) ? midA   : midB;
  for (let i = 0; i < 6; i++) slotColors[13 + i] = (i % 2 === 0) ? outerA : outerB;

  return (
    <svg
      width={size}
      height={size}
      viewBox="-40 -40 80 80"
      style={{ flexShrink: 0, display: 'block', borderRadius: '50%', background: '#fff' }}
    >
      {POLKA_POS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={5.8} fill={slotColors[i]} />
      ))}
    </svg>
  );
};

// Primary lavender-pill button (based on real screenshot, not the css var)
const NSButton = ({ variant = 'primary', children, onClick, icon, iconRight, disabled, size = 'md', style }) => {
  const base = {
    font: 'var(--type-button-large)',
    padding: size === 'sm' ? '5px 12px' : '7px 14px',
    borderRadius: 999, border: 0, cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    transition: 'background .12s, box-shadow .12s',
    whiteSpace: 'nowrap',
  };
  const variants = {
    primary: { background: disabled ? '#C9CBFA' : '#7A7EEC', color: '#fff', boxShadow: '0 1px 0 rgba(0,0,0,.04)' },
    secondary: { background: '#fff', color: '#363643', boxShadow: 'var(--card-shadow)' },
    tab: { background: '#fff', color: '#363643', boxShadow: 'var(--card-shadow)', borderRadius: 8 },
    ghost: { background: 'transparent', color: '#363643' },
    text: { background: 'transparent', color: '#4649F6', padding: '2px 0' },
    danger: { background: '#FEDDE6', color: '#F52163', borderRadius: 999 },
    warning: { background: '#FEEDDD', color: '#F68F07', borderRadius: 999 },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...style }} onClick={disabled ? undefined : onClick} disabled={disabled}>
      {icon && <NSIcon src={icon} size={14} />}
      {children}
      {iconRight && <NSIcon src={iconRight} size={14} />}
    </button>
  );
};

// Flat plate / card
const NSPlate = ({ children, style, padding = '14px 16px', onClick, hover = false, id }) => {
  const [h, setH] = React.useState(false);
  return (
    <div id={id} onClick={onClick}
      onMouseEnter={() => hover && setH(true)} onMouseLeave={() => hover && setH(false)}
      style={{
        background: h ? '#FAFAFC' : '#fff', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background .12s',
        ...style
      }}>{children}</div>
  );
};

// Tonal badge (uppercase caption)
const NSBadge = ({ children, tone = 'gray', style }) => {
  const map = {
    gray: ['#F0F0F3', '#79797D'],
    indigo: ['#E1E2FE', '#4649F6'],
    green: ['#DAF1E1', '#01A63E'],
    red: ['#FEDDE6', '#F52163'],
    orange: ['#FEEDDD', '#F68F07'],
    purple: ['#F4EEFF', '#7B29FF'],
    lightblue: ['#E8F5F9', '#2795B6'],
  };
  const [bg, fg] = map[tone] || map.gray;
  return (
    <span style={{
      font: '600 10px Inter, system-ui', letterSpacing: '.75px', textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: 4, background: bg, color: fg,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      ...style
    }}>{children}</span>
  );
};

// Circular icon-button (send / receive / copy / etc)
const IconBtn = ({ src, onClick, size = 28, iconSize = 14, title, disabled }) => {
  const [h, setH] = React.useState(false);
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: size, height: size, border: 0, borderRadius: '50%', cursor: disabled ? 'default' : 'pointer',
        background: h && !disabled ? '#F0F0F3' : 'transparent',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? .35 : 1, flexShrink: 0,
      }}>
      <NSIcon src={src} size={iconSize} style={{ opacity: .75 }} />
    </button>
  );
};

// Search input (pill)
const SearchInput = ({ placeholder = 'Search', width = 230, value, onChange, autoFocus }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 8,
      background: '#fff', width,
      boxShadow: focused ? '0 0 0 2px rgba(70,73,246,.16), var(--card-shadow)' : 'var(--card-shadow)',
      transition: 'box-shadow .12s',
    }}>
      <NSIcon src="../../assets/icons/func/search.svg" size={12} style={{ opacity: .5 }} />
      <input placeholder={placeholder} value={value || ''} onChange={e => onChange?.(e.target.value)}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          border: 0, outline: 0, background: 'transparent', flex: 1, minWidth: 0,
          font: '500 13px Inter, system-ui', color: '#363643',
        }} />
      {value && <button onClick={() => onChange('')} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 2, display: 'flex' }}>
        <NSIcon src="../../assets/icons/func/close.svg" size={10} style={{ opacity: .5 }} />
      </button>}
    </div>
  );
};

// Address truncator  "5Grwv…8sVY"
const truncate = (addr, head = 4, tail = 4) =>
  addr.length <= head + tail + 2 ? addr : `${addr.slice(0, head)}…${addr.slice(-tail)}`;

// Full-screen modal
const NSModal = ({ open, onClose, title, subtitle, width = 440, children, footer }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(21, 21, 36, 0.32)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(2px)',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#F8F8FA', width, maxHeight: '88vh', borderRadius: 16,
        boxShadow: '0 30px 60px -12px rgba(24,24,45,0.35)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px 12px', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ font: 'var(--type-title)', color: '#363643', letterSpacing: '-0.016em' }}>{title}</div>
            {subtitle && <div style={{ font: 'var(--type-footnote)', color: '#79797D', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, border: 0, borderRadius: '50%', background: 'rgba(69,69,137,0.06)',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <NSIcon src="../../assets/icons/func/close.svg" size={10} style={{ opacity: 0.6 }} />
          </button>
        </div>
        <div style={{ padding: '0 20px 20px', flex: 1, overflow: 'auto' }}>{children}</div>
        {footer && <div style={{ padding: '12px 20px 20px', borderTop: '0.5px solid rgba(69,69,137,0.08)' }}>{footer}</div>}
      </div>
    </div>
  );
};

const NSField = ({ label, right, children, hint, error }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
      <label style={{ font: '500 11px Inter, system-ui', color: '#79797D', flex: 1 }}>{label}</label>
      {right}
    </div>
    {children}
    {(hint || error) && (
      <div style={{ font: '500 11px Inter, system-ui', color: error ? '#F52163' : '#79797D', marginTop: 4 }}>
        {error || hint}
      </div>
    )}
  </div>
);

Object.assign(window, {
  NSIcon, NSButton, NSPlate, NSBadge, NSModal, NSField, TokenIcon, ChainIcon, ChainDot, ChainList, Identicon,
  IconBtn, SearchInput, truncate, tokenColor,
});
