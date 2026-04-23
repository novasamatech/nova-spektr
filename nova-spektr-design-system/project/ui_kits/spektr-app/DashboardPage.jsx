// Nova Spektr — Dashboard page (Overview · Staking · Governance)

// ============================ WALLET FILTER ============================
// Subset-of-accounts filter shown in Dashboard header. Selection scales
// every dashboard surface (portfolio, staking, governance).

const DASH_WALLETS = [
  {
    id: 'valentun-vault', name: 'valentun', type: 'Polkadot Vault',
    icon: '../../assets/icons/wallet/vaultColor.svg',
    accounts: [
      { id: 'v-stash', name: 'Stash',       addr: '5Grwv…8sVY', weight: 0.38 },
      { id: 'v-ctrl',  name: 'Controller',  addr: '5Fq8…4Hxp',  weight: 0.09 },
    ],
  },
  {
    id: 'treasury-ledger', name: 'Treasury Ledger', type: 'Nova Wallet',
    icon: '../../assets/icons/wallet/novaWalletColor.svg',
    accounts: [
      { id: 'l-main', name: 'Main', addr: '14i0y…oJEaM', weight: 0.25 },
    ],
  },
  {
    id: 'ops-multisig', name: 'Ops 2/3', type: 'Multisig',
    icon: '../../assets/icons/wallet/polkadotExtensionColor.svg',
    accounts: [
      { id: 'ms-treasury', name: 'Treasury multisig', addr: '13mS…Lv3n', weight: 0.13 },
    ],
  },
  {
    id: 'wc-mobile', name: 'Mobile', type: 'WalletConnect',
    icon: '../../assets/icons/wallet/walletConnectColor.svg',
    accounts: [
      { id: 'wc-dot', name: 'DOT account', addr: '1GpGh…gEjsq', weight: 0.10 },
      { id: 'wc-ksm', name: 'KSM account', addr: '15oF…kH2Lm', weight: 0.05 },
    ],
  },
  {
    id: 'address-book', name: 'Address book', type: 'Watch-only',
    icon: '../../assets/icons/nav/address-book.svg',
    watchOnly: true,
    accounts: [
      { id: 'ab-novasama',  name: 'Novasama',  addr: '15UHvP…GPM3p9', weight: 0.10 },
      { id: 'ab-solocrack', name: 'solocrack', addr: '13mAjF…KVtfaq', weight: 0.04 },
      { id: 'ab-alice',     name: 'Alice',     addr: '5HZ3qP…aBcD4',  weight: 0.00 },
    ],
  },
  {
    id: 'readonly-wallet', name: 'External', type: 'Read-only',
    icon: '../../assets/icons/wallet/vaultColor.svg',
    readOnly: true,
    accounts: [
      { id: 'ro-obs', name: 'DOT observer', addr: '16qBpn…XrmVFw', weight: 0.06 },
    ],
  },
];
const DASH_ALL_ACCOUNT_IDS = DASH_WALLETS.flatMap(w => w.accounts.map(a => a.id));
const ACCOUNT_BY_ID = Object.fromEntries(
  DASH_WALLETS.flatMap(w => w.accounts.map(a => [a.id, { ...a, walletId: w.id, wallet: w }])),
);
// Per-account palette — used in stacked reward bars, donut slices, chain-by-account dots.
// Kept intentionally muted so 6 stacked segments don't "vibrate"; distinct in hue so
// neighbouring accounts stay readable. Brand pinks/blacks are reserved for DOT/KSM legends.
const ACCOUNT_COLORS = ['#6D7DD8', '#5AA8BD', '#7FB583', '#E3A366', '#A78BCF', '#D87FA0'];
const colorForAccount = (accountId) => {
  const idx = DASH_ALL_ACCOUNT_IDS.indexOf(accountId);
  return ACCOUNT_COLORS[(idx < 0 ? 0 : idx) % ACCOUNT_COLORS.length];
};

const BUILTIN_ALL_PRESET = { id: 'all', name: 'All accounts', builtin: true, accountIds: DASH_ALL_ACCOUNT_IDS };
const SEED_PRESETS = [
  {
    id: 'staking-focus', name: 'Staking focus', builtin: false,
    accountIds: ['v-stash', 'l-main'],
  },
  {
    id: 'mobile-only', name: 'Mobile only', builtin: false,
    accountIds: ['wc-dot', 'wc-ksm'],
  },
];

const WalletFilterContext = React.createContext(null);
const useWalletFilter = () => React.useContext(WalletFilterContext);

const WalletFilterProvider = ({ children }) => {
  const [presets, setPresets] = React.useState(() => {
    try {
      const raw = localStorage.getItem('spektr-dash-presets');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return SEED_PRESETS;
  });
  const [activePresetId, setActivePresetId] = React.useState(() =>
    localStorage.getItem('spektr-dash-active-preset') || 'all',
  );
  React.useEffect(() => {
    try { localStorage.setItem('spektr-dash-presets', JSON.stringify(presets)); } catch (e) {}
  }, [presets]);
  React.useEffect(() => {
    localStorage.setItem('spektr-dash-active-preset', activePresetId);
  }, [activePresetId]);

  const allPresets = [BUILTIN_ALL_PRESET, ...presets];
  const activePreset = allPresets.find(p => p.id === activePresetId) || BUILTIN_ALL_PRESET;
  const selected = new Set(activePreset.accountIds);

  const upsertPreset = (preset) => setPresets(prev => {
    const exists = prev.findIndex(p => p.id === preset.id);
    if (exists >= 0) {
      const next = prev.slice();
      next[exists] = preset;
      return next;
    }
    return [...prev, preset];
  });
  const deletePreset = (id) => {
    setPresets(prev => prev.filter(p => p.id !== id));
    if (activePresetId === id) setActivePresetId('all');
  };

  const scale = React.useMemo(() => {
    let s = 0;
    for (const w of DASH_WALLETS) for (const a of w.accounts) if (selected.has(a.id)) s += a.weight;
    return s;
  }, [activePresetId, presets]);

  const selectedCount = selected.size;
  const walletsWithAny = DASH_WALLETS.filter(w => w.accounts.some(a => selected.has(a.id)));
  const selectedAccounts = DASH_ALL_ACCOUNT_IDS
    .filter(id => selected.has(id))
    .map(id => ({ ...ACCOUNT_BY_ID[id], color: colorForAccount(id) }));
  const isAll = selectedCount === DASH_ALL_ACCOUNT_IDS.length;
  const isNone = selectedCount === 0;
  const isReadOnlyAccount = (id) => {
    const acc = ACCOUNT_BY_ID[id];
    return !!(acc && ((acc.wallet && acc.wallet.readOnly) || acc.readOnly));
  };
  const isWatchOnlyAccount = (id) => {
    if (isReadOnlyAccount(id)) return false;
    const acc = ACCOUNT_BY_ID[id];
    return !!(acc && acc.wallet && acc.wallet.watchOnly);
  };
  const hasWatchOnly = walletsWithAny.some(w => w.watchOnly && !w.readOnly);
  const hasReadOnly = walletsWithAny.some(w => w.readOnly);

  const value = {
    presets: allPresets, activePreset, activePresetId, setActivePresetId,
    upsertPreset, deletePreset,
    selected, selectedAccounts, scale, selectedCount, walletsWithAny, isAll, isNone,
    hasWatchOnly, isWatchOnlyAccount,
    hasReadOnly, isReadOnlyAccount,
    totalAccounts: DASH_ALL_ACCOUNT_IDS.length,
  };
  return <WalletFilterContext.Provider value={value}>{children}</WalletFilterContext.Provider>;
};

const readOnlyTip = (addr) => `Add account ${addr} to perform that operation`;

const FilterCheckbox = ({ state }) => {
  const bg = state === 'unchecked' ? '#fff' : '#4649F6';
  const border = state === 'unchecked' ? 'rgba(69,69,137,0.24)' : '#4649F6';
  return (
    <span style={{
      width: 16, height: 16, borderRadius: 4, background: bg,
      boxShadow: `inset 0 0 0 1.5px ${border}`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {state === 'checked' && <NSIcon src="../../assets/icons/func/checkmark.svg" size={10} style={{ filter: 'brightness(0) invert(1)' }} />}
      {state === 'indeterminate' && <span style={{ width: 8, height: 2, background: '#fff', borderRadius: 1 }} />}
    </span>
  );
};

// Small preview: up-to-3 wallet icons of wallets that have any account in the preset
const PresetPreview = ({ accountIds, size = 18 }) => {
  const walletsWithAny = DASH_WALLETS.filter(w => w.accounts.some(a => accountIds.includes(a.id)));
  if (walletsWithAny.length === 0) {
    return <span style={{ width: size, height: size, borderRadius: 4, background: 'rgba(69,69,137,0.06)', display: 'inline-block' }} />;
  }
  return (
    <div style={{ display: 'inline-flex' }}>
      {walletsWithAny.slice(0, 3).map((w, i) => (
        <img key={w.id} src={w.icon} style={{
          width: size, height: size, borderRadius: 4, marginLeft: i === 0 ? 0 : -5,
          boxShadow: '0 0 0 1.5px #fff', display: 'block',
        }} />
      ))}
    </div>
  );
};

const PresetPicker = () => {
  const f = useWalletFilter();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const label = f.activePreset.name;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 8px',
          borderRadius: 8, background: '#fff', border: 0, cursor: 'pointer',
          boxShadow: open ? '0 0 0 2px rgba(70,73,246,.16), var(--card-shadow)' : 'var(--card-shadow)',
          transition: 'box-shadow .12s',
          font: '500 13px Inter, system-ui', color: '#363643',
        }}
      >
        <PresetPreview accountIds={f.activePreset.accountIds} />
        <span>{label}</span>
        <NSIcon src="../../assets/icons/chevron/down.svg" size={10} style={{ opacity: 0.5 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 20,
          width: 280, background: '#fff', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(24,24,45,0.14)',
          border: '0.5px solid rgba(69,69,137,0.08)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px', font: '600 11px Inter, system-ui', color: '#79797D', letterSpacing: '.5px', textTransform: 'uppercase' }}>
            Presets
          </div>
          {f.presets.map(p => {
            const active = p.id === f.activePresetId;
            return (
              <button
                key={p.id}
                onClick={() => { f.setActivePresetId(p.id); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '8px 14px', border: 0, background: active ? 'rgba(69,69,137,0.04)' : 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <PresetPreview accountIds={p.accountIds} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 12px Inter, system-ui', color: '#363643' }}>{p.name}</div>
                  <div style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>
                    {p.accountIds.length} {p.accountIds.length === 1 ? 'account' : 'accounts'}
                  </div>
                </div>
                {active && <NSIcon src="../../assets/icons/func/checkmark.svg" size={12} style={{ opacity: 0.8 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PresetManagerButton = ({ onOpen }) => (
  <button
    onClick={onOpen}
    title="Manage presets"
    style={{
      width: 30, height: 30, border: 0, background: '#fff', borderRadius: 8,
      boxShadow: 'var(--card-shadow)', cursor: 'pointer', display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center',
    }}
  >
    <NSIcon src="../../assets/icons/func/filter.svg" size={14} style={{ opacity: 0.55 }} />
  </button>
);

const uid = () => `p-${Math.random().toString(36).slice(2, 9)}`;

const PresetEditor = ({ preset, onChange, onDelete, onRename }) => {
  const [open, setOpen] = React.useState(false);
  const accountIds = new Set(preset.accountIds);
  const toggleAccount = (id) => {
    const next = new Set(accountIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(Array.from(next));
  };
  const toggleWallet = (w) => {
    const next = new Set(accountIds);
    const allIn = w.accounts.every(a => next.has(a.id));
    w.accounts.forEach(a => allIn ? next.delete(a.id) : next.add(a.id));
    onChange(Array.from(next));
  };

  return (
    <div style={{
      background: '#fff', borderRadius: 10, border: '0.5px solid rgba(69,69,137,0.08)',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
        <PresetPreview accountIds={preset.accountIds} size={20} />
        {preset.builtin ? (
          <div style={{ flex: 1, font: '600 13px Inter, system-ui', color: '#363643' }}>{preset.name}</div>
        ) : (
          <input
            value={preset.name}
            onChange={(e) => onRename(e.target.value)}
            placeholder="Preset name"
            style={{
              flex: 1, border: 0, outline: 0, background: 'transparent',
              font: '600 13px Inter, system-ui', color: '#363643',
            }}
          />
        )}
        <div style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>
          {preset.accountIds.length} / {DASH_ALL_ACCOUNT_IDS.length}
        </div>
        {!preset.builtin && (
          <button onClick={() => setOpen(o => !o)} style={{
            border: 0, background: 'rgba(69,69,137,0.06)', borderRadius: 6,
            padding: '4px 8px', cursor: 'pointer',
            font: '600 11px Inter, system-ui', color: '#363643',
          }}>{open ? 'Done' : 'Edit'}</button>
        )}
        {!preset.builtin && (
          <button onClick={onDelete} title="Delete" style={{
            width: 26, height: 26, border: 0, borderRadius: 6, cursor: 'pointer',
            background: 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <NSIcon src="../../assets/icons/func/close.svg" size={10} style={{ opacity: 0.55 }} />
          </button>
        )}
      </div>
      {!preset.builtin && open && (
        <div style={{ borderTop: '0.5px solid rgba(69,69,137,0.06)', padding: '4px 0 8px' }}>
          {DASH_WALLETS.map(w => {
            const checkedCount = w.accounts.filter(a => accountIds.has(a.id)).length;
            const allIn = checkedCount === w.accounts.length;
            const noneIn = checkedCount === 0;
            return (
              <div key={w.id}>
                <button
                  onClick={() => toggleWallet(w)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '6px 12px', border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <img src={w.icon} style={{ width: 18, height: 18, borderRadius: 4 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '600 12px Inter, system-ui', color: '#363643' }}>{w.name}</div>
                    <div style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>{w.type}</div>
                  </div>
                  <FilterCheckbox state={allIn ? 'checked' : noneIn ? 'unchecked' : 'indeterminate'} />
                </button>
                {w.accounts.map(a => {
                  const on = accountIds.has(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={(e) => { e.stopPropagation(); toggleAccount(a.id); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '5px 12px 5px 36px', border: 0, background: 'transparent',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <Identicon seed={a.id} size={16} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ font: '500 12px Inter, system-ui', color: '#363643' }}>{a.name}</div>
                        <div style={{ font: '500 10px Inter, system-ui', color: '#79797D' }}>{a.addr}</div>
                      </div>
                      <FilterCheckbox state={on ? 'checked' : 'unchecked'} />
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PresetManagerModal = ({ open, onClose }) => {
  const f = useWalletFilter();
  const customPresets = f.presets.filter(p => !p.builtin);
  return (
    <NSModal open={open} onClose={onClose} title="Account presets" subtitle="Save subsets of wallets to switch between them quickly" width={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PresetEditor
          preset={BUILTIN_ALL_PRESET}
          onChange={() => {}}
          onRename={() => {}}
          onDelete={() => {}}
        />
        {customPresets.map(p => (
          <PresetEditor
            key={p.id}
            preset={p}
            onChange={(ids) => f.upsertPreset({ ...p, accountIds: ids })}
            onRename={(name) => f.upsertPreset({ ...p, name })}
            onDelete={() => f.deletePreset(p.id)}
          />
        ))}
        <button
          onClick={() => f.upsertPreset({ id: uid(), name: 'New preset', builtin: false, accountIds: [] })}
          style={{
            padding: '10px 12px', border: '1px dashed rgba(69,69,137,0.24)',
            background: 'transparent', borderRadius: 10, cursor: 'pointer',
            font: '600 12px Inter, system-ui', color: '#4649F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <NSIcon src="../../assets/icons/func/add-circle.svg" size={12} style={{ opacity: 0.8 }} />
          Add preset
        </button>
      </div>
    </NSModal>
  );
};

const DashHeaderControls = () => {
  const [managerOpen, setManagerOpen] = React.useState(false);
  return (
    <>
      <PresetPicker />
      <PresetManagerButton onOpen={() => setManagerOpen(true)} />
      <PresetManagerModal open={managerOpen} onClose={() => setManagerOpen(false)} />
    </>
  );
};

const DashTabs = ({ tab, setTab }) => (
  <div style={{ display: 'inline-flex', gap: 4, background: 'rgba(69,69,137,0.06)', padding: 2, borderRadius: 8 }}>
    {['Overview', 'Staking', 'Governance'].map(t => (
      <button key={t} onClick={() => setTab(t)} style={{
        font: '600 12px Inter, system-ui', padding: '5px 14px', border: 0, borderRadius: 6, cursor: 'pointer',
        background: tab === t ? '#fff' : 'transparent',
        boxShadow: tab === t ? 'var(--card-shadow)' : 'none',
        color: '#363643',
      }}>{t}</button>
    ))}
  </div>
);

// ============================ OVERVIEW ============================

const ALLOC = [
  { label: 'Transferable', pct: 20.4, color: '#2795B6' },
  { label: 'Locked',       pct: 10.1, color: '#4649F6' },
  { label: 'Reserved',     pct: 69.5, color: '#F68F07' },
];
const HOLDINGS = [
  { sym: 'DOT',  amount: 227047.41, unit: 'DOT',  usd: 292891.14, delta:  2.46, color: '#E6007A' },
  { sym: 'KSM',  amount: 702.94,    unit: 'KSM',  usd: 3367.07,   delta:  1.54, color: '#000000' },
  { sym: 'USDC', amount: 955.06,    unit: 'USDC', usd: 954.90,    delta:  0.00, color: '#2775CA' },
  { sym: 'ASTR', amount: 5069.13,   unit: 'ASTR', usd: 41.79,     delta: -0.20, color: '#1B6DC1' },
  { sym: 'USDT', amount: 26.74,     unit: 'USDT', usd: 26.73,     delta:  0.01, color: '#26A17B' },
  { sym: 'BNC',  amount: 409.4,     unit: 'BNC',  usd: 13.26,     delta: -0.08, color: '#5ACDFE' },
];
const PRICES = [
  { sym: 'DOT',  price: 1.29,   delta:  2.46 },
  { sym: 'KSM',  price: 4.79,   delta:  1.54 },
  { sym: 'AAVE', price: 92.88,  delta:  3.08 },
  { sym: 'kBTC', price: 76672,  delta:  1.94 },
  { sym: 'HDX',  price: 0.0031, delta: -1.34 },
];

const Donut = ({ items, size = 150, thickness = 28 }) => {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  const total = items.reduce((s, i) => s + i.pct, 0) || 1;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      {items.map((it, i) => {
        const len = (it.pct / total) * c;
        const off = c - acc;
        acc += len;
        return (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={it.color} strokeWidth={thickness}
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={off} />
        );
      })}
    </svg>
  );
};

// Annular-slice path: outer arc → radial line → inner arc (reverse) → close.
const annularSlicePath = (cx, cy, R, r, startDeg, endDeg) => {
  const toRad = (d) => ((d - 90) * Math.PI) / 180;
  const x1o = cx + R * Math.cos(toRad(startDeg));
  const y1o = cy + R * Math.sin(toRad(startDeg));
  const x2o = cx + R * Math.cos(toRad(endDeg));
  const y2o = cy + R * Math.sin(toRad(endDeg));
  const x1i = cx + r * Math.cos(toRad(startDeg));
  const y1i = cy + r * Math.sin(toRad(startDeg));
  const x2i = cx + r * Math.cos(toRad(endDeg));
  const y2i = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${x1o} ${y1o}`,
    `A ${R} ${R} 0 ${large} 1 ${x2o} ${y2o}`,
    `L ${x2i} ${y2i}`,
    `A ${r} ${r} 0 ${large} 0 ${x1i} ${y1i}`,
    'Z',
  ].join(' ');
};

// Full annulus (for when there's a single 100% slice — an arc from 0° to 360° is ambiguous).
const fullAnnulusPath = (cx, cy, R, r) =>
  `M ${cx - R},${cy} A ${R},${R} 0 1,1 ${cx + R},${cy} A ${R},${R} 0 1,1 ${cx - R},${cy} ` +
  `M ${cx - r},${cy} A ${r},${r} 0 1,0 ${cx + r},${cy} A ${r},${r} 0 1,0 ${cx - r},${cy} Z`;

// Items: { id, pct, color, label, valueFiat, valueToken?, share? }
// renderCenter: () => ReactNode shown when nothing is hovered.
const HoverableDonut = ({ items, size = 150, thickness = 28, renderCenter }) => {
  const [hover, setHover] = React.useState(null);
  const cx = size / 2, cy = size / 2;
  const R = size / 2;
  const inner = R - thickness;
  const total = items.reduce((s, i) => s + i.pct, 0) || 1;
  const gap = items.length > 1 ? 0.8 : 0; // small deg gap between slices

  let acc = 0;
  const slices = items.map((it, i) => {
    const frac = it.pct / total;
    const start = (acc / total) * 360 + gap / 2;
    acc += it.pct;
    const end = (acc / total) * 360 - gap / 2;
    const path = items.length === 1
      ? fullAnnulusPath(cx, cy, R, inner)
      : annularSlicePath(cx, cy, R, inner, start, end);
    return { path, color: it.color, frac, item: it, singleFull: items.length === 1 };
  });

  const hovered = hover != null ? slices[hover] : null;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} onMouseLeave={() => setHover(null)}>
        {items.length === 1 && (
          <path
            d={slices[0].path}
            fill={slices[0].color}
            fillRule="evenodd"
            onMouseEnter={() => setHover(0)}
            style={{ cursor: 'pointer' }}
          />
        )}
        {items.length > 1 && slices.map((s, i) => (
          <path
            key={i}
            d={s.path}
            fill={s.color}
            onMouseEnter={() => setHover(i)}
            style={{
              cursor: 'pointer',
              opacity: hover == null || hover === i ? 1 : 0.35,
              transition: 'opacity 0.1s',
            }}
          />
        ))}
      </svg>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: 8,
      }}>
        {renderCenter ? renderCenter() : null}
      </div>
    </div>
  );
};

const OverviewView = () => {
  const [view, setView] = React.useState('Asset');
  const { scale } = useWalletFilter();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <NSPlate padding="16px 18px">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>Portfolio Overview</div>
              <div style={{ font: '800 26px Manrope', letterSpacing: '-0.02em', color: '#363643', marginTop: 4 }}>
                ${(297313.93 * scale).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ font: '500 12px Inter, system-ui', color: scale > 0 ? '#01A63E' : '#79797D', marginTop: 4 }}>
                {scale > 0 ? `↑ 2.14% · $${(6205.40 * scale).toLocaleString('en-US', { maximumFractionDigits: 2 })} today` : 'No accounts selected'}
              </div>
            </div>
            <div>
              <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginBottom: 8 }}>Asset Allocation</div>
              {ALLOC.map(a => (
                <div key={a.label} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', font: '500 11px Inter, system-ui', color: '#363643' }}>
                    <span>{a.label}</span><span>{a.pct}%</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(69,69,137,0.06)', borderRadius: 999, marginTop: 3 }}>
                    <div style={{ width: `${a.pct}%`, height: '100%', background: a.color, borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </NSPlate>

        <NSPlate padding="16px 18px">
          <div style={{ display: 'inline-flex', gap: 2, background: 'rgba(69,69,137,0.06)', padding: 2, borderRadius: 8, marginBottom: 16 }}>
            {['Asset', 'Chain'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                font: '600 12px Inter, system-ui', padding: '5px 32px', border: 0, borderRadius: 6, cursor: 'pointer',
                background: view === v ? '#fff' : 'transparent',
                boxShadow: view === v ? 'var(--card-shadow)' : 'none',
                color: '#363643',
              }}>By {v}</button>
            ))}
          </div>
          <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginBottom: 12 }}>Holdings by {view}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 24, alignItems: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Donut items={HOLDINGS.map(h => ({ pct: (h.usd / 297313.93) * 100 || 0.5, color: h.color }))} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {HOLDINGS.map(h => (
                <div key={h.sym} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: scale === 0 ? 0.4 : 1 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: h.color }} />
                  <TokenIcon symbol={h.sym} size={22} />
                  <span style={{ font: '600 12px Inter, system-ui', flex: 1 }}>{h.sym}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ font: '500 12px Inter, system-ui' }}>
                      {(h.amount * scale).toLocaleString('en-US', { maximumFractionDigits: 2 })} {h.unit}
                    </div>
                    <div style={{ font: '500 10px Inter, system-ui', marginTop: 1, color: h.delta > 0 ? '#01A63E' : h.delta < 0 ? '#F52163' : '#79797D' }}>
                      {h.delta > 0 ? '↑' : h.delta < 0 ? '↓' : '→'} {Math.abs(h.delta).toFixed(2)}% ${(h.usd * scale).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </NSPlate>

        <NSPlate padding="16px 18px">
          <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginBottom: 12 }}>Price Tracker</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {PRICES.map(p => (
              <div key={p.sym} style={{ padding: '8px 10px', background: '#fff', border: '0.5px solid rgba(69,69,137,0.08)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <TokenIcon symbol={p.sym} size={16} />
                  <span style={{ font: '600 12px Inter, system-ui' }}>{p.sym}</span>
                </div>
                <div style={{ font: '600 13px Inter, system-ui' }}>${p.price < 1 ? p.price : p.price.toLocaleString('en-US')}</div>
                <div style={{ font: '500 10px Inter, system-ui', color: p.delta >= 0 ? '#01A63E' : '#F52163', marginTop: 2 }}>
                  {p.delta >= 0 ? '↑' : '↓'} {Math.abs(p.delta).toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </NSPlate>
      </div>

      <NSPlate padding="16px 18px" style={{ alignSelf: 'start' }}>
        <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginBottom: 8 }}>Latest Transactions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          {[
            { dir: 'out', sym: 'DOT', amt: 2.1,   who: '15oF…kH2Lm', time: 'Today, 14:47' },
            { dir: 'in',  sym: 'USDT', amt: 12.4, who: '1GpGh…gEjsq', time: 'Today, 11:02' },
            { dir: 'out', sym: 'KSM', amt: 0.12,  who: '12HWs…Kk6',   time: 'Yesterday' },
            { dir: 'in',  sym: 'DOT', amt: 50.0,  who: 'valentun',     time: 'Yesterday' },
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%', background: t.dir === 'in' ? '#DAF1E1' : 'rgba(69,69,137,0.06)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <NSIcon src={t.dir === 'in' ? '../../assets/icons/arrows/receive-arrow.svg' : '../../assets/icons/arrows/send-arrow.svg'} size={12} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '600 12px Inter' }}>{t.dir === 'in' ? 'Received' : 'Sent'} {t.amt} {t.sym}</div>
                <div style={{ font: '500 11px Inter', color: '#79797D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.dir === 'in' ? 'from' : 'to'} {t.who} · {t.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </NSPlate>
    </div>
  );
};

// ============================ STAKING ============================

const CHAIN_STAKES = [
  {
    chainId: 'polkadot-ah', chain: 'Polkadot Asset Hub', token: 'DOT',
    price: 1.29, apy: 17.4, nextEra: '2h 12m',
    positions: [
      { accountId: 'v-stash',     staked: 900.0,  activeStake: 900.0,  validators: 12, elected: 10, rewards: 60.1, status: 'Active' },
      { accountId: 'l-main',      staked: 322.0,  activeStake: 322.0,  validators: 8,  elected: 8,  rewards: 21.4, status: 'Active' },
      { accountId: 'ms-treasury', staked: 58.5,   activeStake:  51.0,  validators: 6,  elected: 5,  rewards: 4.7,  status: 'Active' },
      { accountId: 'ab-novasama', staked: 2500.0, activeStake: 2500.0, validators: 16, elected: 16, rewards: 164.3, status: 'Active' },
      { accountId: 'ro-obs',      staked: 1200.0, activeStake: 1200.0, validators: 14, elected: 12, rewards: 78.0,  status: 'Active' },
    ],
  },
  {
    chainId: 'kusama-ah', chain: 'Kusama Asset Hub', token: 'KSM',
    price: 4.79, apy: 14.9, nextEra: '0h 42m',
    positions: [
      { accountId: 'v-stash',      staked: 3.1,  activeStake: 3.1,  validators: 8,  elected: 7,  rewards: 0.22, status: 'Active' },
      { accountId: 'wc-ksm',       staked: 1.7,  activeStake: 1.7,  validators: 6,  elected: 6,  rewards: 0.19, status: 'Active' },
      { accountId: 'ab-solocrack', staked: 82.3, activeStake: 82.3, validators: 16, elected: 15, rewards: 5.2,  status: 'Active' },
    ],
  },
];

const VALIDATOR_NAMES = [
  'Vault Staking', 'Foundation 1', 'Foundation 2', 'Foundation 3', 'Foundation 4',
  'Staking4All', 'Allnodes', 'Luganodes', 'Nodes.Guru', 'Refresh',
  'Stake.Works', 'Novasama', 'CryptoCrew', 'NewRoad Network', 'StakePool',
  'Vitwit', 'anvel', 'AiNodes',
];
const makeFakeAddr = (rand) => {
  const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789';
  let head = '5';
  let tail = '';
  for (let i = 0; i < 6; i++) head += alpha[Math.floor(rand() * alpha.length)];
  for (let i = 0; i < 6; i++) tail += alpha[Math.floor(rand() * alpha.length)];
  return `${head}…${tail}`;
};

const VALIDATOR_POOL_NAMES = [
  ...VALIDATOR_NAMES,
  'P2P.org', 'BlockOps', 'Figment', 'Chorus One', 'Coinbase Cloud',
  'Lavender Five', 'Cryptonode', 'Bware Labs', 'Zondax', 'PathrockNetwork',
  'SpiderStake', 'SyncNode', 'DSRV',
];

const getValidatorsFor = (accountId, chainId, electedCount, totalCount = 16) => {
  const seed = (accountId + chainId).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
  const rand = seededRand(seed);
  const names = (VALIDATOR_POOL_NAMES.length >= totalCount ? VALIDATOR_POOL_NAMES : VALIDATOR_NAMES).slice(0, totalCount);
  return names.map((name, i) => {
    const slashed = rand() < 0.07;
    const oversubscribed = !slashed && rand() < 0.22;
    const chilled = !slashed && !oversubscribed && rand() < 0.06;
    return {
      id: `${chainId}-${accountId}-${i}`,
      name,
      addr: makeFakeAddr(rand),
      apy: +(7 + rand() * 9).toFixed(2),
      nominators: Math.floor(80 + rand() * 520),
      rewardedNominators: Math.floor(80 + rand() * 320),
      totalStake: Math.floor(30_000 + rand() * 5_000_000),
      ownStake: +(rand() * 0.8).toFixed(3),
      producedBlocks: Math.floor(rand() * 520),
      eraPoints: Math.floor(rand() * 50_000),
      elected: i < electedCount,
      slashed,
      oversubscribed,
      chilled,
      identity: rand() > 0.45 ? {
        email: `hello@${name.toLowerCase().replace(/[\s.]/g, '')}.com`,
        web: `https://${name.toLowerCase().replace(/[\s.]/g, '')}.io`,
        twitter: `@${name.replace(/\s/g, '')}`,
      } : null,
    };
  });
};
// Rewards assets & periods
const REWARD_ASSETS = {
  DOT: { price: 1.29, color: '#E6007A', dailyMean: 0.61, dailyVar: 0.08 },
  KSM: { price: 4.79, color: '#000000', dailyMean: 0.055, dailyVar: 0.015 },
};
const REWARD_PERIODS = [
  { id: '7D',  days: 7,   label: 'last 7 days',  bucket: 'day'   },
  { id: '30D', days: 30,  label: 'last 30 days', bucket: 'day'   },
  { id: '90D', days: 90,  label: 'last 90 days', bucket: 'day'   },
  { id: '1Y',  days: 365, label: 'last year',    bucket: 'month' },
];
const REWARD_REF_DATE = new Date('2026-04-22T00:00:00Z');
const REWARD_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const seededRand = (seed) => {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 10000) / 10000;
  };
};

const buildRewards = (asset, periodId, scale = 1) => {
  const cfg = REWARD_ASSETS[asset];
  const period = REWARD_PERIODS.find(p => p.id === periodId);
  const rand = seededRand((asset.charCodeAt(0) * 31 + asset.charCodeAt(1)) ^ (periodId.charCodeAt(0) * 7));
  const daily = [];
  for (let i = period.days - 1; i >= 0; i--) {
    const d = new Date(REWARD_REF_DATE);
    d.setUTCDate(d.getUTCDate() - i);
    const wobble = (rand() - 0.5) * 2 * cfg.dailyVar;
    const seasonal = Math.sin((d.getUTCDate() + d.getUTCMonth() * 30) / 8) * cfg.dailyVar * 0.3;
    daily.push({ date: d, amount: Math.max(0, (cfg.dailyMean + wobble + seasonal) * scale) });
  }
  if (period.bucket === 'month') {
    const byMonth = new Map();
    for (const p of daily) {
      const key = p.date.getUTCFullYear() * 12 + p.date.getUTCMonth();
      const entry = byMonth.get(key) || { date: new Date(Date.UTC(p.date.getUTCFullYear(), p.date.getUTCMonth(), 1)), amount: 0 };
      entry.amount += p.amount;
      byMonth.set(key, entry);
    }
    return Array.from(byMonth.values());
  }
  return daily;
};

const fmtRewardDate = (d, bucket) =>
  bucket === 'month'
    ? `${REWARD_MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(-2)}`
    : `${REWARD_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;

const fmtRewardAmount = (v, asset) => {
  const digits = asset === 'KSM' ? 4 : 2;
  return `${v.toFixed(digits)} ${asset}`;
};
const fmtFiat = (v) => `$${v.toFixed(2)}`;

const pickAxisTicks = (len, maxTicks = 7) => {
  if (len <= maxTicks) return Array.from({ length: len }, (_, i) => i);
  const step = (len - 1) / (maxTicks - 1);
  const out = [];
  for (let i = 0; i < maxTicks; i++) out.push(Math.round(i * step));
  return out;
};

// Bucket daily data into ~maxBars wider buckets. For 1Y (already monthly), returns as-is.
const bucketForBars = (daily, periodCfg, maxBars = 30) => {
  if (periodCfg.bucket === 'month') return daily;
  if (daily.length <= maxBars) return daily;
  const groupSize = Math.ceil(daily.length / maxBars);
  const out = [];
  for (let i = 0; i < daily.length; i += groupSize) {
    const slice = daily.slice(i, i + groupSize);
    const end = slice[slice.length - 1].date;
    out.push({ date: end, amount: slice.reduce((s, d) => s + d.amount, 0), span: slice.length });
  }
  return out;
};

const RewardsBars = ({ data, asset, bucket, accounts, width = 520, height = 140 }) => {
  const price = REWARD_ASSETS[asset].price;
  const padTop = 16, padBottom = 16, padX = 6;
  const innerH = height - padTop - padBottom;
  const innerW = width - padX * 2;

  const totalWeight = accounts.reduce((s, a) => s + a.weight, 0) || 1;
  const bars = data.map(d => ({
    date: d.date,
    total: d.amount,
    segments: accounts.map(a => ({
      accountId: a.id,
      name: a.name,
      walletName: a.wallet.name,
      color: a.color,
      value: d.amount * (a.weight / totalWeight),
    })),
  }));

  const max = Math.max(0.00001, ...bars.map(b => b.total));
  const n = bars.length;
  const barGap = Math.max(1, Math.min(4, Math.floor(innerW / n / 6)));
  const barW = Math.max(2, (innerW - barGap * (n - 1)) / n);

  const [hover, setHover] = React.useState(null);
  const svgRef = React.useRef(null);

  const onMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const xSvg = (xPx / rect.width) * width;
    const relX = xSvg - padX;
    const idx = Math.max(0, Math.min(n - 1, Math.floor(relX / (barW + barGap))));
    setHover(idx);
  };
  const onLeave = () => setHover(null);

  const tip = hover != null && bars[hover] ? (() => {
    const b = bars[hover];
    const cx = padX + hover * (barW + barGap) + barW / 2;
    return { bar: b, leftRatio: cx / width };
  })() : null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ display: 'block', cursor: 'crosshair' }}
      >
        {bars.map((b, i) => {
          const x = padX + i * (barW + barGap);
          const barHeight = (b.total / max) * innerH;
          const yBase = padTop + innerH;
          const isHover = i === hover;
          let yCursor = yBase;
          const segments = b.segments.filter(s => s.value > 0);
          return (
            <g key={i}>
              {isHover && (
                <rect
                  x={x - barGap / 2}
                  y={padTop}
                  width={barW + barGap}
                  height={innerH}
                  fill="rgba(0,0,0,0.04)"
                  rx="4"
                />
              )}
              {segments.length === 0 ? null : segments.map((s, si) => {
                const h = (s.value / max) * innerH;
                yCursor -= h;
                const isTop = si === segments.length - 1;
                const isBot = si === 0;
                return (
                  <rect
                    key={si}
                    x={x}
                    y={yCursor}
                    width={barW}
                    height={Math.max(h, 0.5)}
                    fill={s.color}
                    rx={isTop || isBot ? Math.min(2, barW / 3) : 0}
                    ry={isTop || isBot ? Math.min(2, barW / 3) : 0}
                    opacity={isHover || hover == null ? 1 : 0.85}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {tip && (
        <div style={{
          position: 'absolute',
          left: `${tip.leftRatio * 100}%`,
          top: 4,
          transform: `translate(${tip.leftRatio > 0.75 ? 'calc(-100% - 10px)' : '10px'}, 0)`,
          background: '#fff',
          border: '1px solid #e2e2e2',
          borderRadius: 8,
          padding: '8px 10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 2,
          minWidth: 180,
        }}>
          <div style={{ font: '500 10px Inter, system-ui', color: '#79797D', marginBottom: 4 }}>
            {fmtRewardDate(tip.bar.date, bucket)}
          </div>
          <div style={{ font: '700 14px Manrope', letterSpacing: '-0.01em', color: '#363643' }}>
            {fmtRewardAmount(tip.bar.total, asset)}
          </div>
          <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginBottom: 6 }}>
            {fmtFiat(tip.bar.total * price)}
          </div>
          {tip.bar.segments.filter(s => s.value > 0).slice().reverse().map(s => (
            <div key={s.accountId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }} />
              <span style={{ font: '500 11px Inter, system-ui', color: '#79797D', flex: 1 }}>
                {s.walletName} · {s.name}
              </span>
              <span style={{ font: '600 11px Inter, system-ui', color: '#363643' }}>
                {fmtRewardAmount(s.value, asset)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Multi-series chart used when 2 assets are selected, or when mode is "cumulative".
// - Bars mode: grouped bars (one per asset per bucket), values expressed in fiat to normalise scales.
// - Cumulative mode: per-asset area/line of running fiat total.
const RewardsMultiChart = ({ series, mode, bucket, height = 140 }) => {
  const wrapRef = React.useRef(null);
  const [width, setWidth] = React.useState(520);
  React.useEffect(() => {
    if (!wrapRef.current || typeof ResizeObserver === 'undefined') return;
    const el = wrapRef.current;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const padTop = 16, padBottom = 16, padX = 6;
  const innerH = height - padTop - padBottom;
  const innerW = width - padX * 2;
  const n = series[0]?.entries.length || 0;

  const processed = series.map(s => {
    const price = REWARD_ASSETS[s.asset].price;
    const fiats = s.entries.map(e => e.amount * price);
    const tokens = s.entries.map(e => e.amount);
    let acc = 0, tacc = 0;
    const cumFiat = fiats.map(v => (acc += v));
    const cumTok  = tokens.map(v => (tacc += v));
    return { ...s, price, fiats, tokens, cumFiat, cumTok };
  });

  const values = processed.map(s => mode === 'cumulative' ? s.cumFiat : s.fiats);
  const max = Math.max(0.00001, ...values.flat());

  const barGap = Math.max(1, Math.min(4, Math.floor(innerW / Math.max(1, n) / 6)));
  const groupW = n === 0 ? innerW : (innerW - barGap * (n - 1)) / n;
  const innerBarGap = 1;
  const barW = processed.length === 1
    ? groupW
    : Math.max(2, (groupW - innerBarGap * (processed.length - 1)) / processed.length);

  const [hover, setHover] = React.useState(null);
  const svgRef = React.useRef(null);

  // X position helpers. In bars mode we center within each group's slot; in
  // cumulative mode we stretch points across the full inner width so the
  // first/last nodes touch the chart edges.
  const groupCenter = (idx) => padX + idx * (groupW + barGap) + groupW / 2;
  const cumX = (idx) => (n <= 1 ? padX + innerW / 2 : padX + (idx / (n - 1)) * innerW);

  const onMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const xSvg = (xPx / rect.width) * width;
    if (mode === 'cumulative') {
      const relX = xSvg - padX;
      const idx = Math.max(0, Math.min(n - 1, Math.round((relX / Math.max(1, innerW)) * (n - 1))));
      setHover(idx);
    } else {
      const relX = xSvg - padX;
      const idx = Math.max(0, Math.min(n - 1, Math.floor(relX / (groupW + barGap))));
      setHover(idx);
    }
  };
  const onLeave = () => setHover(null);

  const hoverX = (idx) => mode === 'cumulative' ? cumX(idx) : groupCenter(idx);

  const tip = hover != null && n > 0 ? (() => {
    const entries = processed.map(s => ({
      asset: s.asset,
      color: s.color,
      amountTok: mode === 'cumulative' ? s.cumTok[hover]  : s.tokens[hover],
      amountFiat: mode === 'cumulative' ? s.cumFiat[hover] : s.fiats[hover],
    }));
    const leftRatio = hoverX(hover) / width;
    return { date: series[0].entries[hover].date, entries, leftRatio };
  })() : null;

  const paths = mode === 'cumulative' ? processed.map(s => {
    const pts = s.cumFiat.map((v, idx) => [
      cumX(idx),
      padTop + innerH - (v / max) * innerH,
    ]);
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
    const area = `${line} L ${pts[pts.length - 1][0]} ${padTop + innerH} L ${pts[0][0]} ${padTop + innerH} Z`;
    return { asset: s.asset, color: s.color, line, area, pts };
  }) : [];

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        shapeRendering="geometricPrecision"
        style={{ display: 'block', cursor: 'crosshair' }}
      >
        <defs>
          {processed.map(s => (
            <linearGradient key={s.asset} id={`multi-grad-${s.asset}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {mode === 'cumulative' ? (
          <>
            {paths.map(p => (
              <path key={`area-${p.asset}`} d={p.area} fill={`url(#multi-grad-${p.asset})`} />
            ))}
            {paths.map(p => (
              <path
                key={`line-${p.asset}`}
                d={p.line}
                fill="none"
                stroke={p.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {paths.map(p => p.pts.map((pt, idx) => {
              const isHover = hover === idx;
              return (
                <circle
                  key={`${p.asset}-pt-${idx}`}
                  cx={pt[0]} cy={pt[1]}
                  r={isHover ? 3.5 : 2.5}
                  fill={isHover ? '#fff' : p.color}
                  stroke={isHover ? p.color : 'none'}
                  strokeWidth={isHover ? 1.5 : 0}
                />
              );
            }))}
            {hover != null && (
              <line
                x1={cumX(hover)} x2={cumX(hover)}
                y1={padTop} y2={padTop + innerH}
                stroke="#363643" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 3"
              />
            )}
          </>
        ) : (
          Array.from({ length: n }).map((_, idx) => {
            const groupX = padX + idx * (groupW + barGap);
            const isHover = hover === idx;
            return (
              <g key={idx}>
                {isHover && (
                  <rect
                    x={groupX - barGap / 2} y={padTop}
                    width={groupW + barGap} height={innerH}
                    fill="rgba(0,0,0,0.04)" rx="4"
                  />
                )}
                {processed.map((s, si) => {
                  const h = (s.fiats[idx] / max) * innerH;
                  const x = processed.length === 1
                    ? groupX
                    : groupX + si * (barW + innerBarGap);
                  return (
                    <rect
                      key={s.asset}
                      x={x}
                      y={padTop + innerH - h}
                      width={barW}
                      height={Math.max(h, 0.5)}
                      fill={s.color}
                      rx={Math.min(2, barW / 3)}
                      opacity={isHover || hover == null ? 1 : 0.8}
                    />
                  );
                })}
              </g>
            );
          })
        )}
      </svg>

      {tip && (
        <div style={{
          position: 'absolute',
          left: `${tip.leftRatio * 100}%`,
          top: 4,
          transform: `translate(${tip.leftRatio > 0.75 ? 'calc(-100% - 10px)' : '10px'}, 0)`,
          background: '#fff',
          border: '1px solid #e2e2e2',
          borderRadius: 8,
          padding: '8px 10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 2,
          minWidth: 180,
        }}>
          <div style={{ font: '500 10px Inter, system-ui', color: '#79797D', marginBottom: 4 }}>
            {fmtRewardDate(tip.date, bucket)}
            {mode === 'cumulative' && <span> · cumulative</span>}
          </div>
          {tip.entries.map(e => (
            <div key={e.asset} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: e.color, display: 'inline-block' }} />
              <span style={{ font: '500 11px Inter, system-ui', color: '#79797D', flex: 1 }}>{e.asset}</span>
              <span style={{ font: '600 11px Inter, system-ui', color: '#363643' }}>
                {fmtRewardAmount(e.amountTok, e.asset)}
              </span>
              <span style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>
                {fmtFiat(e.amountFiat)}
              </span>
            </div>
          ))}
          {tip.entries.length > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0 0',
              marginTop: 4, borderTop: '0.5px solid rgba(69,69,137,0.08)',
            }}>
              <span style={{ font: '600 11px Inter, system-ui', color: '#363643', flex: 1 }}>Total</span>
              <span style={{ font: '700 12px Manrope', color: '#363643' }}>
                {fmtFiat(tip.entries.reduce((s, e) => s + e.amountFiat, 0))}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RewardsCard = ({ scale = 1 }) => {
  const [assets, setAssets] = React.useState(() => new Set(['DOT']));
  const [period, setPeriod] = React.useState('7D');
  const [mode, setMode]     = React.useState('bars'); // 'bars' | 'cumulative'
  const [expanded, setExpanded] = React.useState(false);
  const { selectedAccounts, isNone } = useWalletFilter();
  const periodCfg = REWARD_PERIODS.find(p => p.id === period);

  const toggleAsset = (a) => {
    setAssets(prev => {
      const next = new Set(prev);
      if (next.has(a)) {
        if (next.size > 1) next.delete(a);  // keep at least one
      } else next.add(a);
      return next;
    });
  };

  const seriesAll = React.useMemo(() => (
    Array.from(assets).map(a => {
      const raw = buildRewards(a, period, scale);
      return {
        asset: a,
        color: REWARD_ASSETS[a].color,
        entries: bucketForBars(raw, periodCfg, 30),
      };
    })
  ), [assets, period, scale]);

  const singleAssetId = assets.size === 1 ? Array.from(assets)[0] : null;
  const singleSeries = singleAssetId ? seriesAll[0] : null;

  // Totals — for header.
  const perAssetTotals = seriesAll.map(s => {
    const tok = s.entries.reduce((a, e) => a + e.amount, 0);
    const fiat = tok * REWARD_ASSETS[s.asset].price;
    return { asset: s.asset, tok, fiat };
  });
  const totalFiat = perAssetTotals.reduce((a, p) => a + p.fiat, 0);

  const firstSeriesData = singleSeries ? singleSeries.entries : (seriesAll[0]?.entries || []);
  const ticks = pickAxisTicks(firstSeriesData.length, Math.min(7, firstSeriesData.length));

  // Use the existing per-account stacked bar chart only when exactly 1 asset AND Bars mode
  // — otherwise fall back to the multi-series chart.
  const useStackedBars = mode === 'bars' && singleAssetId && selectedAccounts.length > 0;

  const renderTotals = () => (
    <div style={{ font: '700 22px Manrope', letterSpacing: '-0.02em' }}>
      {singleAssetId ? (
        <>
          {perAssetTotals[0].tok.toFixed(singleAssetId === 'KSM' ? 4 : 2)} {singleAssetId}
          <span style={{ font: '500 13px Inter, system-ui', color: '#79797D' }}>
            {' '}· {fmtFiat(perAssetTotals[0].fiat)}
          </span>
        </>
      ) : (
        <>
          {fmtFiat(totalFiat)}
          <span style={{ font: '500 13px Inter, system-ui', color: '#79797D' }}>
            {' '}· {perAssetTotals.map(p => fmtRewardAmount(p.tok, p.asset)).join(' + ')}
          </span>
        </>
      )}
    </div>
  );

  const renderControls = () => (
    <>
      <RewardsPillGroup
        items={[{ id: 'bars', label: 'Bars' }, { id: 'cumulative', label: 'Cumulative' }]}
        value={mode}
        onChange={setMode}
      />
      <RewardsMultiPillGroup
        items={Object.keys(REWARD_ASSETS).map(a => ({
          id: a, label: a, dot: REWARD_ASSETS[a].color,
        }))}
        value={assets}
        onToggle={toggleAsset}
      />
      <RewardsPillGroup
        items={REWARD_PERIODS.map(p => ({ id: p.id, label: p.id }))}
        value={period}
        onChange={setPeriod}
      />
    </>
  );

  const renderChart = (chartHeight, chartWidth) => {
    if (isNone) {
      return (
        <div style={{
          height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center',
          font: '500 12px Inter, system-ui', color: '#A4A4AD',
        }}>
          No accounts selected
        </div>
      );
    }
    if (useStackedBars) {
      return (
        <RewardsBars
          data={singleSeries.entries}
          asset={singleAssetId}
          bucket={periodCfg.bucket}
          accounts={selectedAccounts}
          width={chartWidth}
          height={chartHeight}
        />
      );
    }
    return (
      <RewardsMultiChart
        series={seriesAll}
        mode={mode}
        bucket={periodCfg.bucket}
        height={chartHeight}
      />
    );
  };

  const renderTicks = (trailing) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
      <div style={{
        flex: 1, display: 'flex', justifyContent: 'space-between',
        font: '500 10px Inter', color: '#A4A4AD',
      }}>
        {firstSeriesData.length > 0 && ticks.map(i => (
          <span key={i}>{fmtRewardDate(firstSeriesData[i].date, periodCfg.bucket)}</span>
        ))}
      </div>
      {trailing}
    </div>
  );

  const ExpandBtn = () => (
    <button
      onClick={() => setExpanded(true)}
      title="Expand"
      style={{
        width: 22, height: 22, border: 0, borderRadius: 5,
        background: 'rgba(69,69,137,0.06)', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
        <path d="M1 6V1H6" stroke="#363643" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 10V15H10" stroke="#363643" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  return (
    <>
      <NSPlate padding="16px 18px">
        <div style={{
          display: 'flex', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap',
        }}>
          <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', flex: 1, minWidth: 140 }}>
            Rewards ({periodCfg.label}){mode === 'cumulative' && ' · cumulative'}
          </div>
          {renderControls()}
        </div>

        {renderTotals()}
        {renderChart(140, 520)}
        {renderTicks(<ExpandBtn />)}
      </NSPlate>

      <NSModal
        open={expanded}
        onClose={() => setExpanded(false)}
        title="Rewards"
        subtitle={`${periodCfg.label}${mode === 'cumulative' ? ' · cumulative' : ''}`}
        width={960}
        initialHeight={620}
        resizable
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {renderTotals()}
            <span style={{ flex: 1 }} />
            {renderControls()}
          </div>
          <ResizingChartArea renderChart={renderChart} />
          {renderTicks()}
        </div>
      </NSModal>
    </>
  );
};

// Observes its own box and forwards the current pixel size to the chart renderer,
// so the expanded Rewards modal grows its chart as the user resizes the modal.
const ResizingChartArea = ({ renderChart }) => {
  const ref = React.useRef(null);
  const [size, setSize] = React.useState({ w: 900, h: 380 });
  React.useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize({ w: Math.max(400, Math.round(width)), h: Math.max(160, Math.round(height)) });
      }
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ flex: 1, minHeight: 200 }}>
      {renderChart(size.h, size.w)}
    </div>
  );
};

// Single-select pill group.
const RewardsPillGroup = ({ items, value, onChange }) => (
  <div style={{ display: 'inline-flex', gap: 2, background: 'rgba(69,69,137,0.06)', padding: 2, borderRadius: 6 }}>
    {items.map(it => {
      const active = value === it.id;
      return (
        <button key={it.id} onClick={() => onChange(it.id)} style={{
          font: '600 10px Inter, system-ui', padding: '3px 8px', border: 0, borderRadius: 4, cursor: 'pointer',
          background: active ? '#fff' : 'transparent',
          boxShadow: active ? 'var(--card-shadow)' : 'none',
          color: '#363643',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>{it.label}</button>
      );
    })}
  </div>
);

// Multi-select pill group (at least one required — `onToggle` enforces the min upstream).
const RewardsMultiPillGroup = ({ items, value, onToggle }) => (
  <div style={{ display: 'inline-flex', gap: 2, background: 'rgba(69,69,137,0.06)', padding: 2, borderRadius: 6 }}>
    {items.map(it => {
      const active = value.has(it.id);
      return (
        <button key={it.id} onClick={() => onToggle(it.id)} style={{
          font: '600 10px Inter, system-ui', padding: '3px 8px', border: 0, borderRadius: 4, cursor: 'pointer',
          background: active ? '#fff' : 'transparent',
          boxShadow: active ? 'var(--card-shadow)' : 'none',
          color: active ? '#363643' : '#A4A4AD',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: it.dot,
            display: 'inline-block', opacity: active ? 1 : 0.35,
          }} />
          {it.label}
        </button>
      );
    })}
  </div>
);

const UNBONDING_ITEMS = [
  { id: 'u-ready-dot',  num: 100.0, sym: 'DOT', chainId: 'polkadot-ah', accountId: 'v-stash',     ready: true,  era: 1498, digits: 1 },
  { id: 'u-ready-ksm',  num: 0.8,   sym: 'KSM', chainId: 'kusama-ah',   accountId: 'v-stash',     ready: true,  era: 6720, digits: 2 },
  { id: 'u-ready-ab',   num: 180.0, sym: 'DOT', chainId: 'polkadot-ah', accountId: 'ab-novasama', ready: true,  era: 1495, digits: 1 },
  { id: 'u-ready-ro',   num: 60.0,  sym: 'DOT', chainId: 'polkadot-ah', accountId: 'ro-obs',      ready: true,  era: 1497, digits: 1 },
  { id: 'u-wait-1',     num: 45.0,  sym: 'DOT', chainId: 'polkadot-ah', accountId: 'v-stash',     ready: false, era: 1547, leftDays: 24, digits: 1 },
  { id: 'u-wait-2',     num: 12.5,  sym: 'DOT', chainId: 'polkadot-ah', accountId: 'l-main',      ready: false, era: 1521, leftDays: 8,  digits: 1 },
  { id: 'u-wait-3',     num: 0.4,   sym: 'KSM', chainId: 'kusama-ah',   accountId: 'wc-ksm',      ready: false, era: 6802, leftDays: 6,  digits: 2 },
];

const UnbondingCard = ({ onWithdraw }) => {
  const f = useWalletFilter();
  const items = UNBONDING_ITEMS
    .filter(u => f.selected.has(u.accountId))
    .sort((a, b) => {
      if (a.ready !== b.ready) return a.ready ? -1 : 1;  // ready first
      return (a.leftDays || 0) - (b.leftDays || 0);
    });
  return (
    <NSPlate padding="16px 18px">
      <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginBottom: 12 }}>Unbonding</div>
      {items.length === 0 ? (
        <div style={{ font: '500 12px Inter, system-ui', color: '#79797D', padding: '8px 0' }}>
          Nothing unbonding for the selected accounts.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(u => {
            const acc = ACCOUNT_BY_ID[u.accountId];
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 13px Inter' }}>{u.num.toFixed(u.digits)} {u.sym}</div>
                  <div style={{ font: '500 11px Inter', color: '#79797D' }}>
                    Era {u.era.toLocaleString('en-US')} · {u.ready ? 'Ready' : `${u.leftDays} days left`}
                    {acc && <> · {acc.wallet.name}</>}
                  </div>
                </div>
                {!u.ready ? (
                  <NSBadge tone="orange">Unbonding</NSBadge>
                ) : f.isReadOnlyAccount(u.accountId) ? (
                  <InfoTooltip content={readOnlyTip(acc ? acc.addr : '')} width={240}>
                    <NSBadge tone="gray">Read-only</NSBadge>
                  </InfoTooltip>
                ) : (
                  <NSButton variant="primary" size="sm" onClick={() => onWithdraw([u])}>
                    {f.isWatchOnlyAccount(u.accountId) ? 'Draft' : 'Withdraw'}
                  </NSButton>
                )}
              </div>
            );
          })}
        </div>
      )}
    </NSPlate>
  );
};

const UNBOND_FEES = { DOT: 0.015, KSM: 0.0008 };
const CHAIN_BY_ID = Object.fromEntries(CHAIN_STAKES.map(c => [c.chainId, c]));

const WithdrawModal = ({ ctx, onClose }) => {
  const [submitted, setSubmitted] = React.useState(false);
  React.useEffect(() => { if (ctx) setSubmitted(false); }, [ctx]);
  if (!ctx) return null;

  const draftMode = ctx.items.some(it => {
    const acc = ACCOUNT_BY_ID[it.accountId];
    return acc && acc.wallet && acc.wallet.watchOnly;
  });

  // Group items by chainId to show clean per-chain fees.
  const byChain = new Map();
  for (const it of ctx.items) {
    if (!byChain.has(it.chainId)) byChain.set(it.chainId, []);
    byChain.get(it.chainId).push(it);
  }
  const groups = Array.from(byChain.entries()).map(([chainId, items]) => ({
    chain: CHAIN_BY_ID[chainId],
    items,
    total: items.reduce((s, i) => s + i.num, 0),
    fee: UNBOND_FEES[items[0].sym] || 0,
  }));
  const grandFiat = groups.reduce((s, g) => s + g.total * g.chain.price, 0);

  const footer = submitted ? (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <NSButton variant="primary" onClick={onClose}>Done</NSButton>
    </div>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>
        {ctx.items.length} {ctx.items.length === 1 ? 'payout' : 'payouts'} · ${grandFiat.toFixed(2)}
      </span>
      <span style={{ flex: 1 }} />
      <NSButton variant="secondary" onClick={onClose}>Cancel</NSButton>
      <NSButton variant="primary" onClick={() => setSubmitted(true)}>
        {draftMode ? 'Create a draft' : 'Sign and submit'}
      </NSButton>
    </div>
  );

  return (
    <NSModal
      open={!!ctx}
      onClose={onClose}
      title={submitted ? (draftMode ? 'Draft created' : 'Withdrawal submitted') : 'Withdraw'}
      subtitle={submitted
        ? (draftMode
          ? 'Share the draft with the signer to complete this operation.'
          : 'Your funds will appear in the transferable balance shortly.')
        : 'Move unbonded funds back to your transferable balance.'}
      width={480}
      footer={footer}
    >
      {submitted ? (
        <div style={{ textAlign: 'center', padding: '20px 10px 10px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#DAF1E1', color: '#01A63E',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            font: '700 24px Manrope', margin: '0 auto 14px',
          }}>✓</div>
          <div style={{ font: '700 18px Manrope', letterSpacing: '-0.02em', color: '#363643' }}>
            {draftMode ? 'Draft created' : 'Operation signed'}
          </div>
          <div style={{ font: '500 12px Inter', color: '#79797D', marginTop: 6 }}>
            {draftMode ? 'Draft prepared for ' : 'Withdrawing '}
            {ctx.items.length} {ctx.items.length === 1 ? 'position' : 'positions'} totalling ${grandFiat.toFixed(2)}.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map(g => (
            <NSPlate key={g.chain.chainId} padding="0">
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderBottom: '0.5px solid rgba(69,69,137,0.06)',
              }}>
                <ChainIcon chain={g.chain.chain} size={22} />
                <div style={{ flex: 1 }}>
                  <div style={{ font: '600 13px Inter, system-ui', color: '#363643' }}>{g.chain.chain}</div>
                  <div style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>
                    {g.items.length} {g.items.length === 1 ? 'payout' : 'payouts'} · fee {g.fee} {g.chain.token}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ font: '700 14px Manrope', letterSpacing: '-0.01em', color: '#363643' }}>
                    {g.total.toFixed(g.items[0].digits)} {g.chain.token}
                  </div>
                  <div style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>
                    ${(g.total * g.chain.price).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              {g.items.map((u, i) => {
                const acc = ACCOUNT_BY_ID[u.accountId];
                return (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px',
                      borderTop: i === 0 ? 'none' : '0.5px solid rgba(69,69,137,0.04)',
                    }}
                  >
                    <img src={acc.wallet.icon} style={{ width: 22, height: 22, borderRadius: 5 }} />
                    <Identicon seed={u.accountId} size={20} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: '600 12px Inter, system-ui', color: '#363643' }}>
                        {acc.wallet.name} · {acc.name}
                      </div>
                      <div style={{ font: '500 11px JetBrains Mono, monospace', color: '#79797D' }}>{acc.addr}</div>
                    </div>
                    <div style={{ font: '600 12px Inter, system-ui', color: '#363643' }}>
                      {u.num.toFixed(u.digits)} {u.sym}
                    </div>
                  </div>
                );
              })}
            </NSPlate>
          ))}
        </div>
      )}
    </NSModal>
  );
};

const StakingView = () => {
  const f = useWalletFilter();
  const { scale } = f;
  const rewardsScale = scale;
  const [claimOpen, setClaimOpen] = React.useState(false);
  const [drilldown, setDrilldown] = React.useState(null); // 'positions' | 'rewards' | null
  const [withdrawCtx, setWithdrawCtx] = React.useState(null); // { items: [...] }
  const fmtUsd = (v) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

  // Plate fiat totals are derived from the wallet filter so they match the drilldown modals.
  const activeChains = CHAIN_STAKES.map(c => {
    const sel = c.positions.filter(p => f.selected.has(p.accountId));
    const stakedTok = sel.reduce((a, p) => a + p.staked, 0);
    return { chain: c, sel, stakedTok, stakedFiat: stakedTok * c.price };
  }).filter(c => c.sel.length > 0);
  const totalStakedFiat = activeChains.reduce((s, c) => s + c.stakedFiat, 0);
  const totalRewardsFiat = totalStakedFiat * 2.56;   // lifetime placeholder
  const unclaimedFiat    = totalStakedFiat * 0.067;
  const netCount = activeChains.length;
  const netLabel = netCount === 0 ? '—' : netCount === 1 ? activeChains[0].chain.chain : `across ${netCount} networks`;

  const plates = [
    { key: 'Total staked',      v: fmtUsd(totalStakedFiat),   sub: netLabel,         drilldown: 'positions' },
    { key: 'Total rewards',     v: fmtUsd(totalRewardsFiat),  sub: 'lifetime',       drilldown: 'rewards' },
    { key: 'Unclaimed rewards', v: fmtUsd(unclaimedFiat),     sub: 'ready to claim', claim: true },
    { key: 'Average APY',       v: '16.2%',                   sub: 'last 30 days' },
  ];
  return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {plates.map(p => {
        const interactive = p.claim || !!p.drilldown;
        const onClick =
          p.claim ? () => setClaimOpen(true) :
          p.drilldown ? () => setDrilldown(p.drilldown) :
          undefined;
        return (
          <NSPlate
            key={p.key}
            padding="14px 16px"
            hover={interactive}
            onClick={onClick}
            style={interactive ? { display: 'flex', alignItems: 'center', gap: 10 } : undefined}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>{p.key}</div>
              <div style={{ font: '700 18px Manrope', letterSpacing: '-0.02em', marginTop: 4 }}>{p.v}</div>
              <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginTop: 2 }}>{p.sub}</div>
            </div>
            {p.claim && (
              <NSButton
                variant="primary"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setClaimOpen(true); }}
                disabled={scale === 0}
              >Claim</NSButton>
            )}
            {p.drilldown && (
              <NSIcon src="../../assets/icons/chevron/right.svg" size={10} style={{ opacity: 0.4 }} />
            )}
          </NSPlate>
        );
      })}
    </div>

    <UnclaimedRewardsModal open={claimOpen} onClose={() => setClaimOpen(false)} />
    <StakingPositionsModal open={drilldown === 'positions'} onClose={() => setDrilldown(null)} />
    <TotalRewardsModal open={drilldown === 'rewards'} onClose={() => setDrilldown(null)} />

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      <RewardsCard scale={rewardsScale} />

      <UnbondingCard onWithdraw={(items) => setWithdrawCtx({ items })} />
      <WithdrawModal ctx={withdrawCtx} onClose={() => setWithdrawCtx(null)} />
    </div>

    <StakeByNetworkTable />
  </div>
  );
};

// ============================ STAKE BY NETWORK ============================

const TABLE_COLS = '24px 1fr 80px 140px 140px 70px 90px';

const STAKE_ACTIONS = [
  { id: 'stake-more',  label: 'Stake more' },
  { id: 'unstake',     label: 'Unstake' },
  { id: 'reward-dest', label: 'Reward destination' },
];

const StakeActionMenu = ({ status, onSelect, readOnly = false, readOnlyAddr = '' }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (readOnly) {
    return (
      <div style={{ justifySelf: 'end' }}>
        <InfoTooltip content={readOnlyTip(readOnlyAddr)} width={240}>
          <NSBadge tone="gray">Read-only</NSBadge>
        </InfoTooltip>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative', justifySelf: 'end' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          font: '600 10px Inter, system-ui', letterSpacing: '.75px', textTransform: 'uppercase',
          padding: '3px 6px 3px 8px', borderRadius: 4,
          background: '#DAF1E1', color: '#01A63E',
          border: 0, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}
      >
        {status}
        <NSIcon src="../../assets/icons/chevron/down.svg" size={8} style={{ filter: 'invert(49%) sepia(75%) saturate(2100%) hue-rotate(113deg) brightness(90%)', opacity: 0.8 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 20,
          width: 180, background: '#fff', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(24,24,45,0.14)',
          border: '0.5px solid rgba(69,69,137,0.08)',
          padding: 4,
        }}>
          {STAKE_ACTIONS.map(item => (
            <ActionMenuItem key={item.id} label={item.label}
              onClick={(e) => { e.stopPropagation(); setOpen(false); onSelect(item.id); }} />
          ))}
        </div>
      )}
    </div>
  );
};

const ActionMenuItem = ({ label, onClick }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block', width: '100%', padding: '8px 10px',
        background: hover ? 'rgba(69,69,137,0.04)' : 'transparent',
        border: 0, cursor: 'pointer', borderRadius: 6, textAlign: 'left',
        font: '500 12px Inter, system-ui', color: '#363643',
      }}
    >{label}</button>
  );
};

const REWARD_DESTINATIONS = [
  { id: 'staked',  label: 'Stake (auto-compound)', desc: 'Rewards are added back to the bonded amount.' },
  { id: 'stash',   label: 'Stash',                 desc: 'Rewards go to the stash account as free balance.' },
  { id: 'account', label: 'Other account',         desc: 'Rewards go to a specific address.' },
];

const AccountActionModal = ({ ctx, onClose }) => {
  const [amount, setAmount] = React.useState('');
  const [dest, setDest] = React.useState('staked');
  const [submitted, setSubmitted] = React.useState(false);
  React.useEffect(() => {
    if (ctx) { setAmount(''); setDest('staked'); setSubmitted(false); }
  }, [ctx]);
  if (!ctx) return null;

  const { action, chain, position, account } = ctx;
  const draftMode = !!(account.wallet && account.wallet.watchOnly);
  const fee = FEE[chain.token] || 0;

  const titleMap = {
    'stake-more':  'Stake more',
    'unstake':     'Unstake',
    'reward-dest': 'Reward destination',
  };
  const subtitleMap = {
    'stake-more':  'Add more bonded stake to this position.',
    'unstake':     'Start the unbonding timer on part of your stake.',
    'reward-dest': 'Choose where era rewards are paid to.',
  };

  const amountNum = parseFloat(amount) || 0;
  const digits = chain.token === 'KSM' ? 4 : 2;
  let available = 0, tooLow = false, tooHigh = false, amountValid = false;

  if (action === 'stake-more') {
    available = availableBalance(position.accountId, chain.chainId);
    tooHigh = amountNum + fee > available;
    amountValid = amountNum > 0 && !tooHigh;
  } else if (action === 'unstake') {
    available = position.activeStake;
    tooHigh = amountNum > available;
    amountValid = amountNum > 0 && !tooHigh;
  }

  const canSubmit = action === 'reward-dest' ? true : amountValid;
  const pctButton = (pct) => {
    const limit = action === 'stake-more' ? Math.max(0, available - fee) : available;
    setAmount((limit * pct / 100).toFixed(digits));
  };

  const primaryLabel = draftMode ? 'Create a draft' : ({
    'stake-more': 'Stake more',
    'unstake':    'Unstake',
    'reward-dest':'Save destination',
  }[action]);

  const footer = submitted ? (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <NSButton variant="primary" onClick={onClose}>Done</NSButton>
    </div>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ flex: 1 }} />
      <NSButton variant="secondary" onClick={onClose}>Cancel</NSButton>
      <NSButton variant="primary" onClick={() => setSubmitted(true)} disabled={!canSubmit}>
        {primaryLabel}
      </NSButton>
    </div>
  );

  const AmountField = (
    <NSField
      label="Amount"
      right={
        <span style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>
          {action === 'stake-more' ? 'Available: ' : 'Active stake: '}
          {available.toLocaleString('en-US', { maximumFractionDigits: digits })} {chain.token}
        </span>
      }
      error={tooHigh
        ? (action === 'stake-more' ? 'Not enough balance' : `Cannot exceed ${available} ${chain.token}`)
        : null}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        background: '#fff', borderRadius: 10,
        boxShadow: tooHigh ? 'inset 0 0 0 1.5px #F52163' : 'inset 0 0 0 1px rgba(69,69,137,0.08)',
      }}>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="0.00"
          inputMode="decimal"
          style={{
            border: 0, outline: 0, background: 'transparent', flex: 1,
            font: '700 18px Manrope', letterSpacing: '-0.01em', color: '#363643',
          }}
        />
        <span style={{ font: '600 13px Inter', color: '#79797D' }}>{chain.token}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        {[25, 50, 75, 100].map(pct => (
          <button key={pct} onClick={() => pctButton(pct)} style={{
            flex: 1, padding: '5px 0', border: 0, borderRadius: 6, cursor: 'pointer',
            background: 'rgba(69,69,137,0.06)', color: '#363643',
            font: '600 11px Inter, system-ui',
          }}>{pct === 100 ? 'Max' : `${pct}%`}</button>
        ))}
      </div>
    </NSField>
  );

  const InfoPlate = (rows) => (
    <NSPlate padding="0">
      {rows.map(([k, v], i) => (
        <div key={k} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          borderTop: i === 0 ? 'none' : '0.5px solid rgba(69,69,137,0.06)',
        }}>
          <div style={{ font: '500 12px Inter, system-ui', color: '#79797D', flex: 1 }}>{k}</div>
          <div style={{ font: '600 12px Inter, system-ui', color: '#363643' }}>{v}</div>
        </div>
      ))}
    </NSPlate>
  );

  const HeaderPlate = (
    <NSPlate padding="10px 12px">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ChainIcon chain={chain.chain} size={24} />
        <div style={{ flex: 1 }}>
          <div style={{ font: '600 12px Inter' }}>{chain.chain}</div>
          <div style={{ font: '500 11px Inter', color: '#79797D' }}>{account.wallet.name} · {account.name}</div>
        </div>
        <img src={account.wallet.icon} style={{ width: 22, height: 22, borderRadius: 5 }} />
      </div>
    </NSPlate>
  );

  const stakeMorePreview = InfoPlate([
    ['Current stake',  `${position.staked.toFixed(2)} ${chain.token}`],
    ['After this op',  amountNum > 0
      ? `${(position.staked + amountNum).toFixed(2)} ${chain.token}`
      : '—'],
    ['Estimated APY',  `${chain.apy}%`],
    ['Network fee',    `${fee} ${chain.token}`],
  ]);

  const unstakePreview = InfoPlate([
    ['Current stake',  `${position.staked.toFixed(2)} ${chain.token}`],
    ['After unbond',   amountNum > 0
      ? `${Math.max(0, position.staked - amountNum).toFixed(2)} ${chain.token}`
      : '—'],
    ['Unbonding period', chain.token === 'KSM' ? '7 days' : '28 days'],
    ['Network fee',    `${fee} ${chain.token}`],
  ]);

  const rewardDestBody = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {REWARD_DESTINATIONS.map(d => {
        const active = dest === d.id;
        return (
          <div
            key={d.id}
            onClick={() => setDest(d.id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px', background: '#fff', borderRadius: 10, cursor: 'pointer',
              border: `1.5px solid ${active ? '#4649F6' : 'rgba(69,69,137,0.08)'}`,
              boxShadow: active ? '0 0 0 3px rgba(70,73,246,0.12)' : 'none',
            }}
          >
            <span style={{
              width: 16, height: 16, borderRadius: '50%', marginTop: 2, flexShrink: 0,
              background: '#fff', boxShadow: `inset 0 0 0 1.5px ${active ? '#4649F6' : 'rgba(69,69,137,0.24)'}`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4649F6' }} />}
            </span>
            <div>
              <div style={{ font: '600 13px Inter', color: '#363643' }}>{d.label}</div>
              <div style={{ font: '500 11px Inter', color: '#79797D', marginTop: 2 }}>{d.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const body =
    action === 'stake-more' ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {HeaderPlate}
        {AmountField}
        {stakeMorePreview}
      </div>
    ) : action === 'unstake' ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {HeaderPlate}
        {AmountField}
        {unstakePreview}
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {HeaderPlate}
        {rewardDestBody}
      </div>
    );

  const successMessage = (() => {
    if (action === 'stake-more') return `${amountNum.toFixed(digits)} ${chain.token} added to your stake on ${chain.chain}.`;
    if (action === 'unstake')    return `${amountNum.toFixed(digits)} ${chain.token} is now unbonding. Withdraw after the unbonding period.`;
    const label = REWARD_DESTINATIONS.find(d => d.id === dest).label;
    return `Reward destination set to "${label}".`;
  })();

  const submittedTitle = draftMode
    ? 'Draft created'
    : ({ 'stake-more': 'Stake increased', 'unstake': 'Unbonding started', 'reward-dest': 'Destination saved' }[action]);

  return (
    <NSModal
      open={!!ctx}
      onClose={onClose}
      title={submitted ? submittedTitle : titleMap[action]}
      subtitle={submitted
        ? (draftMode ? 'Share the draft with the signer to complete this operation.' : null)
        : subtitleMap[action]}
      width={480}
      footer={footer}
    >
      {submitted ? (
        <div style={{ textAlign: 'center', padding: '20px 10px 10px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#DAF1E1', color: '#01A63E',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            font: '700 24px Manrope', margin: '0 auto 14px',
          }}>✓</div>
          <div style={{ font: '700 18px Manrope', letterSpacing: '-0.02em', color: '#363643' }}>{submittedTitle}</div>
          <div style={{ font: '500 12px Inter', color: '#79797D', marginTop: 6 }}>{successMessage}</div>
        </div>
      ) : body}
    </NSModal>
  );
};

const StakeByNetworkTable = () => {
  const f = useWalletFilter();
  const [expanded, setExpanded] = React.useState(() => new Set(['polkadot-ah']));
  const [validatorsCtx, setValidatorsCtx] = React.useState(null); // { chain, position, account }
  const [actionCtx, setActionCtx] = React.useState(null); // { action, chain, position, account }
  const [startFlowOpen, setStartFlowOpen] = React.useState(false);

  const toggleChain = (id) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const chains = CHAIN_STAKES.map(c => ({
    ...c,
    positions: c.positions.filter(p => f.selected.has(p.accountId)),
  })).filter(c => c.positions.length > 0);

  return (
    <>
      <NSPlate padding="0">
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '0.5px solid rgba(69,69,137,0.06)' }}>
          <div style={{ font: '600 13px Inter', flex: 1 }}>Your stake by network</div>
          <NSButton variant="primary" size="sm" onClick={() => setStartFlowOpen(true)}>Start staking</NSButton>
        </div>

        {chains.length === 0 ? (
          <div style={{ padding: '36px 18px', textAlign: 'center', font: '500 12px Inter, system-ui', color: '#79797D' }}>
            No active stake for the selected accounts.
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: TABLE_COLS, gap: 12,
              padding: '10px 18px', borderBottom: '0.5px solid rgba(69,69,137,0.06)',
              font: '600 10px Inter, system-ui', color: '#A4A4AD', letterSpacing: '.5px', textTransform: 'uppercase',
            }}>
              <span />
              <span>Network</span>
              <span style={{ textAlign: 'right' }}>Accounts</span>
              <span style={{ textAlign: 'right' }}>Staked</span>
              <span style={{ textAlign: 'right' }}>Active stake</span>
              <span style={{ textAlign: 'right' }}>APY</span>
              <span style={{ textAlign: 'right' }}>Next era</span>
            </div>

            {chains.map((c) => {
              const totalStaked = c.positions.reduce((s, p) => s + p.staked, 0);
              const totalActiveStake = c.positions.reduce((s, p) => s + p.activeStake, 0);
              const totalValue = totalStaked * c.price;
              const activePct = totalStaked > 0 ? (totalActiveStake / totalStaked) * 100 : 0;
              const isOpen = expanded.has(c.chainId);
              return (
                <div key={c.chainId}>
                  <button
                    onClick={() => toggleChain(c.chainId)}
                    style={{
                      display: 'grid', gridTemplateColumns: TABLE_COLS, gap: 12,
                      alignItems: 'center', width: '100%', textAlign: 'left',
                      padding: '14px 18px', background: 'transparent', border: 0, cursor: 'pointer',
                      borderTop: '0.5px solid rgba(69,69,137,0.06)',
                    }}
                  >
                    <NSIcon
                      src={isOpen ? '../../assets/icons/chevron/down.svg' : '../../assets/icons/chevron/right.svg'}
                      size={10}
                      style={{ opacity: 0.55 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ChainIcon chain={c.chain} size={28} />
                      <div style={{ font: '600 13px Inter' }}>{c.chain}</div>
                    </div>
                    <span style={{ font: '600 12px Inter', textAlign: 'right' }}>{c.positions.length}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ font: '600 13px Inter' }}>
                        {totalStaked.toLocaleString('en-US', { maximumFractionDigits: 2 })} {c.token}
                      </div>
                      <div style={{ font: '500 11px Inter', color: '#79797D', marginTop: 2 }}>
                        ${totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ font: '600 13px Inter' }}>
                        {totalActiveStake.toLocaleString('en-US', { maximumFractionDigits: 2 })} {c.token}
                      </div>
                      <InfoTooltip
                        content={activePct < 100
                          ? `Only ${activePct.toFixed(1)}% of your stake is actively nominating. The rest is bonded but not backing any validator.`
                          : 'All your bonded stake is actively nominating.'}
                      >
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          font: '600 11px Inter, system-ui', marginTop: 2,
                          color: activePct < 100 ? '#F68F07' : '#79797D',
                          cursor: 'help',
                        }}>
                          {activePct < 100 && (
                            <span style={{
                              width: 10, height: 10, borderRadius: '50%',
                              background: '#F68F07', color: '#fff',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              font: '700 8px Inter', lineHeight: 1,
                            }}>!</span>
                          )}
                          {activePct.toFixed(1)}%
                        </span>
                      </InfoTooltip>
                    </div>
                    <span style={{ font: '600 12px Inter', textAlign: 'right' }}>{c.apy}%</span>
                    <span style={{ font: '500 12px Inter', color: '#79797D', textAlign: 'right' }}>{c.nextEra}</span>
                  </button>

                  {isOpen && (
                    <div style={{ background: 'rgba(69,69,137,0.02)' }}>
                      <div style={{
                        display: 'grid', gridTemplateColumns: '24px 1fr 140px 130px 70px 100px 90px', gap: 12,
                        padding: '8px 18px 8px 42px',
                        font: '600 10px Inter, system-ui', color: '#A4A4AD', letterSpacing: '.5px', textTransform: 'uppercase',
                      }}>
                        <span />
                        <span>Account</span>
                        <span style={{ textAlign: 'right' }}>Staked</span>
                        <span style={{ textAlign: 'right' }}>Active stake</span>
                        <span style={{ textAlign: 'right' }}>Share</span>
                        <span style={{ textAlign: 'right' }}>Validators</span>
                        <span />
                      </div>
                      {c.positions.map(p => {
                        const acc = ACCOUNT_BY_ID[p.accountId];
                        const share = totalStaked ? (p.staked / totalStaked) * 100 : 0;
                        const pctActive = p.staked ? (p.activeStake / p.staked) * 100 : 0;
                        return (
                          <div
                            key={p.accountId}
                            style={{
                              display: 'grid', gridTemplateColumns: '24px 1fr 140px 130px 70px 100px 90px', gap: 12,
                              padding: '10px 18px 10px 42px', alignItems: 'center',
                              borderTop: '0.5px solid rgba(69,69,137,0.04)',
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: colorForAccount(p.accountId) }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <img src={acc.wallet.icon} style={{ width: 20, height: 20, borderRadius: 5 }} />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ font: '600 12px Inter, system-ui', color: '#363643' }}>
                                  {acc.wallet.name} · {acc.name}
                                </div>
                                <div style={{ font: '500 11px JetBrains Mono, monospace', color: '#79797D' }}>{acc.addr}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ font: '600 12px Inter' }}>
                                {p.staked.toLocaleString('en-US', { maximumFractionDigits: 3 })} {c.token}
                              </div>
                              <div style={{ font: '500 11px Inter', color: '#79797D', marginTop: 2 }}>
                                ${(p.staked * c.price).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ font: '600 12px Inter' }}>
                                {p.activeStake.toLocaleString('en-US', { maximumFractionDigits: 3 })} {c.token}
                              </div>
                              <InfoTooltip
                                content={pctActive < 100
                                  ? `Only ${pctActive.toFixed(1)}% of this account's bonded stake is actively nominating.`
                                  : 'All bonded stake is actively nominating.'}
                              >
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 3,
                                  font: '600 11px Inter, system-ui', marginTop: 2,
                                  color: pctActive < 100 ? '#F68F07' : '#79797D',
                                  cursor: 'help',
                                }}>
                                  {pctActive < 100 && (
                                    <span style={{
                                      width: 10, height: 10, borderRadius: '50%',
                                      background: '#F68F07', color: '#fff',
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      font: '700 8px Inter', lineHeight: 1,
                                    }}>!</span>
                                  )}
                                  {pctActive.toFixed(1)}%
                                </span>
                              </InfoTooltip>
                            </div>
                            <span style={{ font: '500 12px Inter', color: '#363643', textAlign: 'right' }}>{share.toFixed(1)}%</span>
                            <button
                              onClick={() => setValidatorsCtx({ chain: c, position: p, account: acc })}
                              style={{
                                font: '600 12px Inter, system-ui', color: '#4649F6',
                                background: 'transparent', border: 0, cursor: 'pointer', padding: 0,
                                textAlign: 'right', display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
                              }}
                            >
                              {p.elected}/{p.validators}
                              <NSIcon src="../../assets/icons/chevron/right.svg" size={9} style={{ opacity: 0.6 }} />
                            </button>
                            <StakeActionMenu
                              status={p.status}
                              readOnly={f.isReadOnlyAccount(p.accountId)}
                              readOnlyAddr={acc.addr}
                              onSelect={(action) => setActionCtx({
                                action,
                                chain: c,
                                position: p,
                                account: ACCOUNT_BY_ID[p.accountId],
                              })}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </NSPlate>

      <ValidatorsModal ctx={validatorsCtx} onClose={() => setValidatorsCtx(null)} />
      <StartStakingFlow open={startFlowOpen} onClose={() => setStartFlowOpen(false)} />
      <AccountActionModal ctx={actionCtx} onClose={() => setActionCtx(null)} />
    </>
  );
};

// ============================ VALIDATORS MODALS ============================

const fmtCompact = (v) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

const ValidatorRow = ({ v, token, price, onOpen }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: '1fr 120px 140px 28px',
    gap: 12, padding: '10px 16px', alignItems: 'center',
    borderTop: '0.5px solid rgba(69,69,137,0.06)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <Identicon seed={v.id} size={22} />
      <div style={{ minWidth: 0 }}>
        <div style={{ font: '600 12px Inter, system-ui', color: '#363643', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {v.name}
        </div>
        <div style={{ font: '500 11px JetBrains Mono, monospace', color: '#79797D' }}>{v.addr}</div>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ font: '600 12px Inter' }}>{v.ownStake.toFixed(3)} {token}</div>
      <div style={{ font: '500 11px Inter', color: '#79797D' }}>${(v.ownStake * price).toFixed(2)}</div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ font: '600 12px Inter' }}>{fmtCompact(v.totalStake)} {token}</div>
      <div style={{ font: '500 11px Inter', color: '#79797D' }}>${fmtCompact(v.totalStake * price)}</div>
    </div>
    <button onClick={onOpen} title="Validator info" style={{
      width: 26, height: 26, border: 0, borderRadius: 6, cursor: 'pointer',
      background: 'rgba(69,69,137,0.06)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ font: '600 11px Inter', color: '#79797D' }}>i</span>
    </button>
  </div>
);

const ValidatorsSection = ({ title, validators, token, price, defaultOpen, onOpenValidator }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '12px 16px', border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ font: '600 13px Inter, system-ui', color: '#363643', flex: 1 }}>
          {title} <span style={{ color: '#79797D', font: '500 13px Inter' }}>({validators.length})</span>
        </span>
        <NSIcon
          src={open ? '../../assets/icons/chevron/up.svg' : '../../assets/icons/chevron/down.svg'}
          size={10}
          style={{ opacity: 0.5 }}
        />
      </button>
      {open && validators.length > 0 && (
        <div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 120px 140px 28px', gap: 12,
            padding: '6px 16px', font: '600 10px Inter, system-ui', color: '#A4A4AD',
            letterSpacing: '.5px', textTransform: 'uppercase',
          }}>
            <span>Account</span>
            <span style={{ textAlign: 'right' }}>Own stake</span>
            <span style={{ textAlign: 'right' }}>Total stake</span>
            <span />
          </div>
          {validators.map(v => (
            <ValidatorRow key={v.id} v={v} token={token} price={price} onOpen={() => onOpenValidator(v)} />
          ))}
        </div>
      )}
      {open && validators.length === 0 && (
        <div style={{ padding: '16px', font: '500 12px Inter', color: '#79797D', textAlign: 'center' }}>
          None
        </div>
      )}
    </div>
  );
};

const ValidatorsModal = ({ ctx, onClose }) => {
  const [selectedValidator, setSelectedValidator] = React.useState(null);
  if (!ctx) return null;
  const { chain, position, account } = ctx;
  const validators = getValidatorsFor(position.accountId, chain.chainId, position.elected, position.validators);
  const elected = validators.filter(v => v.elected);
  const notElected = validators.filter(v => !v.elected);

  return (
    <>
      <NSModal
        open={!!ctx}
        onClose={onClose}
        title="Selected validators"
        subtitle={`${account.wallet.name} · ${account.name} · ${chain.chain}`}
        width={620}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <NSPlate padding="0">
            <ValidatorsSection
              title="Elected"
              validators={elected}
              token={chain.token}
              price={chain.price}
              defaultOpen
              onOpenValidator={setSelectedValidator}
            />
          </NSPlate>
          <NSPlate padding="0">
            <ValidatorsSection
              title="Not elected"
              validators={notElected}
              token={chain.token}
              price={chain.price}
              defaultOpen={false}
              onOpenValidator={setSelectedValidator}
            />
          </NSPlate>
        </div>
      </NSModal>

      <ValidatorInfoModal
        validator={selectedValidator}
        chain={chain}
        onClose={() => setSelectedValidator(null)}
      />
    </>
  );
};

const ValidatorInfoModal = ({ validator, chain, onClose }) => {
  if (!validator) return null;
  const infoRow = (k, v) => (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '10px 14px', borderTop: '0.5px solid rgba(69,69,137,0.06)',
    }}>
      <div style={{ font: '500 12px Inter, system-ui', color: '#79797D', flex: 1 }}>{k}</div>
      <div style={{ font: '600 12px Inter, system-ui', color: '#363643', textAlign: 'right' }}>{v}</div>
    </div>
  );
  return (
    <NSModal open={!!validator} onClose={onClose} title="Validator info" width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <NSPlate padding="12px 14px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Identicon seed={validator.id} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: '600 14px Inter, system-ui', color: '#363643' }}>{validator.name}</div>
              <div style={{ font: '500 11px JetBrains Mono, monospace', color: '#79797D' }}>{validator.addr}</div>
            </div>
          </div>
        </NSPlate>

        <NSPlate padding="0">
          <div style={{ padding: '12px 14px', font: '600 13px Inter', color: '#363643' }}>Staking</div>
          {infoRow('Status', (
            <NSBadge tone={validator.elected ? 'green' : 'gray'}>
              {validator.elected ? 'Elected' : 'Not elected'}
            </NSBadge>
          ))}
          {infoRow('Nominators', (
            <div>
              <div>{validator.nominators}</div>
              <div style={{ font: '500 11px Inter', color: '#79797D' }}>{validator.rewardedNominators} rewarded</div>
            </div>
          ))}
          {infoRow('Total stake', (
            <div>
              <div>{fmtCompact(validator.totalStake)} {chain.token}</div>
              <div style={{ font: '500 11px Inter', color: '#79797D' }}>${fmtCompact(validator.totalStake * chain.price)}</div>
            </div>
          ))}
          {infoRow('Estimated reward', <span style={{ color: '#01A63E' }}>{validator.apy.toFixed(2)}% APY</span>)}
        </NSPlate>

        {validator.identity && (
          <NSPlate padding="0">
            <div style={{ padding: '12px 14px', font: '600 13px Inter', color: '#363643' }}>Identity</div>
            {validator.identity.email && infoRow('Email', <a href={`mailto:${validator.identity.email}`} style={{ color: '#4649F6', textDecoration: 'none' }}>{validator.identity.email}</a>)}
            {validator.identity.web && infoRow('Web', <a href={validator.identity.web} style={{ color: '#4649F6', textDecoration: 'none' }}>{validator.identity.web}</a>)}
            {validator.identity.twitter && infoRow('Twitter', <a href={`https://twitter.com/${validator.identity.twitter.slice(1)}`} style={{ color: '#4649F6', textDecoration: 'none' }}>{validator.identity.twitter}</a>)}
          </NSPlate>
        )}
      </div>
    </NSModal>
  );
};

// ============================ STAKING POSITIONS DRILLDOWN ============================
const STAKING_CHAIN_COLORS = {
  'polkadot-ah': '#E6007A',
  'kusama-ah': '#000000',
};
const StakingPositionsModal = ({ open, onClose }) => {
  const f = useWalletFilter();
  const chains = React.useMemo(() => (
    CHAIN_STAKES
      .map(c => {
        const positions = c.positions.filter(p => f.selected.has(p.accountId));
        const totalStaked = positions.reduce((s, p) => s + p.staked, 0);
        const activeValidators = positions.reduce((s, p) => s + p.elected, 0);
        return {
          chainId: c.chainId,
          chain: c.chain,
          token: c.token,
          price: c.price,
          apy: c.apy,
          totalStaked,
          totalValue: totalStaked * c.price,
          activeValidators,
          accountsCount: positions.length,
          color: STAKING_CHAIN_COLORS[c.chainId] || '#4649F6',
        };
      })
      .filter(c => c.accountsCount > 0)
  ), [f.selected]);

  const grandValue = chains.reduce((s, c) => s + c.totalValue, 0);
  const grandValidators = chains.reduce((s, c) => s + c.activeValidators, 0);
  const donutItems = chains.map(c => ({
    id: c.chainId,
    pct: c.totalValue,
    color: c.color,
    label: c.chain,
    valueFiat: c.totalValue,
    valueToken: `${c.totalStaked.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${c.token}`,
  }));

  return (
    <NSModal open={open} onClose={onClose} title="Staking positions" width={560}>
      {chains.length === 0 ? (
        <div style={{
          padding: '36px 18px', textAlign: 'center',
          font: '500 12px Inter, system-ui', color: '#79797D',
        }}>
          No active stake for the selected accounts.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{
              font: '800 28px Manrope', letterSpacing: '-0.02em', color: '#363643',
            }}>
              ${grandValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ font: '500 12px Inter, system-ui', color: '#79797D', marginTop: 2 }}>
              {grandValidators} active {grandValidators === 1 ? 'validator' : 'validators'}
            </div>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '160px 1fr', gap: 20, alignItems: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <HoverableDonut
                items={donutItems}
                size={150}
                thickness={28}
                renderCenter={() => (
                  <>
                    <div style={{ font: '500 10px Inter, system-ui', color: '#79797D' }}>Total</div>
                    <div style={{ font: '700 14px Manrope', letterSpacing: '-0.01em', color: '#363643' }}>
                      ${grandValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ font: '500 10px Inter, system-ui', color: '#79797D', marginTop: 1 }}>
                      {grandValidators} {grandValidators === 1 ? 'validator' : 'validators'}
                    </div>
                  </>
                )}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {chains.map(c => (
                <div
                  key={c.chainId}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: c.color, marginTop: 5, flexShrink: 0,
                  }} />
                  <ChainIcon chain={c.chain} size={20} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '600 12px Inter, system-ui', color: '#363643' }}>
                      {c.chain}
                    </div>
                    <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginTop: 2 }}>
                      {c.totalStaked.toLocaleString('en-US', { maximumFractionDigits: 2 })} {c.token}
                      {' · '}
                      {c.activeValidators} active {c.activeValidators === 1 ? 'validator' : 'validators'}
                    </div>
                    <div style={{ font: '600 11px Inter, system-ui', color: '#01A63E', marginTop: 2 }}>
                      {c.apy.toFixed(2)}% APY
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ font: '600 12px Inter, system-ui', color: '#363643' }}>
                      ${c.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </NSModal>
  );
};

// ============================ TOTAL REWARDS DRILLDOWN ============================
const TOTAL_REWARDS_PERIODS = [
  { id: '7D',  days: 7,   label: '7D'  },
  { id: '1M',  days: 30,  label: '1M'  },
  { id: '6M',  days: 182, label: '6M'  },
  { id: '1Y',  days: 365, label: '1Y'  },
  { id: 'Max', days: 730, label: 'Max' },
];

const TotalRewardsModal = ({ open, onClose }) => {
  const f = useWalletFilter();
  const [period, setPeriod] = React.useState('1Y');
  const [chainDrill, setChainDrill] = React.useState(null);

  const periodCfg = TOTAL_REWARDS_PERIODS.find(p => p.id === period);

  const chains = React.useMemo(() => (
    CHAIN_STAKES
      .map(c => {
        const selectedCount = c.positions.filter(p => f.selected.has(p.accountId)).length;
        const cfg = REWARD_ASSETS[c.token];
        // Deterministic per-chain total: dailyMean × days × number of selected accounts.
        const totalToken = cfg ? cfg.dailyMean * periodCfg.days * selectedCount : 0;
        const totalFiat = totalToken * c.price;
        return {
          chainId: c.chainId,
          chain: c.chain,
          token: c.token,
          price: c.price,
          color: STAKING_CHAIN_COLORS[c.chainId] || '#4649F6',
          selectedCount,
          totalToken,
          totalFiat,
        };
      })
      .filter(c => c.selectedCount > 0 && c.totalToken > 0)
  ), [f.selected, period]);

  const grandFiat = chains.reduce((s, c) => s + c.totalFiat, 0);
  const donutItems = chains.map(c => ({
    id: c.chainId,
    pct: c.totalFiat,
    color: c.color,
    label: c.chain,
    valueFiat: c.totalFiat,
    valueToken: `${c.totalToken.toLocaleString('en-US', { maximumFractionDigits: c.token === 'KSM' ? 4 : 2 })} ${c.token}`,
  }));

  const PeriodPills = () => (
    <div style={{ display: 'inline-flex', gap: 2, background: 'rgba(69,69,137,0.06)', padding: 2, borderRadius: 6 }}>
      {TOTAL_REWARDS_PERIODS.map(p => {
        const active = period === p.id;
        return (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            style={{
              font: '600 10px Inter, system-ui', padding: '3px 10px', border: 0, borderRadius: 4, cursor: 'pointer',
              background: active ? '#fff' : 'transparent',
              boxShadow: active ? 'var(--card-shadow)' : 'none',
              color: '#363643',
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <NSModal open={open} onClose={onClose} title="Total rewards" width={560}>
      {chains.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ font: '800 28px Manrope', letterSpacing: '-0.02em', color: '#363643' }}>$0.00</div>
            <PeriodPills />
          </div>
          <div style={{
            padding: '36px 18px', textAlign: 'center',
            font: '500 12px Inter, system-ui', color: '#79797D',
          }}>
            No reward data for the selected accounts.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ font: '800 28px Manrope', letterSpacing: '-0.02em', color: '#363643' }}>
              ${grandFiat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <PeriodPills />
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '160px 1fr', gap: 20, alignItems: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <HoverableDonut
                items={donutItems}
                size={150}
                thickness={28}
                renderCenter={() => (
                  <>
                    <div style={{ font: '500 10px Inter, system-ui', color: '#79797D' }}>{periodCfg.label}</div>
                    <div style={{ font: '700 14px Manrope', letterSpacing: '-0.01em', color: '#363643' }}>
                      ${grandFiat.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ font: '500 10px Inter, system-ui', color: '#79797D', marginTop: 1 }}>total</div>
                  </>
                )}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {chains.map(c => (
                <button
                  key={c.chainId}
                  onClick={() => setChainDrill(c)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '8px 8px', borderRadius: 8, border: 0, background: 'transparent',
                    textAlign: 'left', cursor: 'pointer', width: '100%',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(69,69,137,0.04)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: c.color, marginTop: 5, flexShrink: 0,
                  }} />
                  <ChainIcon chain={c.chain} size={20} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '600 12px Inter, system-ui', color: '#363643' }}>
                      {c.chain}
                    </div>
                    <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginTop: 2 }}>
                      {c.totalToken.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: c.token === 'KSM' ? 4 : 2 })} {c.token}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ font: '600 12px Inter, system-ui', color: '#363643' }}>
                      ${c.totalFiat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <NSIcon src="../../assets/icons/chevron/right.svg" size={10} style={{ opacity: 0.4, marginTop: 4 }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <RewardsByChainModal chain={chainDrill} period={period} onClose={() => setChainDrill(null)} />
    </NSModal>
  );
};

const RewardsByChainModal = ({ chain, period, onClose }) => {
  const f = useWalletFilter();
  const [sort, setSort] = React.useState({ key: 'rewards', dir: 'desc' });
  if (!chain) return null;

  const periodCfg = TOTAL_REWARDS_PERIODS.find(p => p.id === period);
  const cfg = REWARD_ASSETS[chain.token];
  const chainRaw = CHAIN_STAKES.find(c => c.chainId === chain.chainId);
  const positions = chainRaw ? chainRaw.positions.filter(p => f.selected.has(p.accountId)) : [];
  const totalStake = positions.reduce((s, p) => s + p.staked, 0) || 1;
  const totalRewards = cfg ? cfg.dailyMean * periodCfg.days * positions.length : 0;

  const rows = positions.map(p => {
    const acc = ACCOUNT_BY_ID[p.accountId];
    const share = p.staked / totalStake;
    const rewards = totalRewards * share;
    const value = rewards * chain.price;
    return { id: p.accountId, acc, rewards, value, share };
  });

  const sorted = rows.slice().sort((a, b) => {
    if (!sort.key) return 0;
    const mul = sort.dir === 'asc' ? 1 : -1;
    const av = a[sort.key] ?? 0, bv = b[sort.key] ?? 0;
    return (av < bv ? -1 : av > bv ? 1 : 0) * mul;
  });

  const grandToken = rows.reduce((s, r) => s + r.rewards, 0);
  const grandValue = rows.reduce((s, r) => s + r.value, 0);

  const donutItems = rows.map(r => ({
    id: r.id,
    pct: r.value,
    color: colorForAccount(r.id),
    label: `${r.acc.wallet.name} · ${r.acc.name}`,
    valueFiat: r.value,
    valueToken: `${r.rewards.toFixed(chain.token === 'KSM' ? 4 : 2)} ${chain.token}`,
  }));

  const COL = '1fr 140px 120px 80px';
  const tokenDigits = chain.token === 'KSM' ? 4 : 2;

  return (
    <NSModal open={!!chain} onClose={onClose} title={`${chain.chain} Rewards`} width={580}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px',
          background: '#fff', borderRadius: 10,
          boxShadow: 'inset 0 -0.5px 0 rgba(69,69,137,0.12)',
        }}>
          <ChainIcon chain={chain.chain} size={22} />
          <div style={{ flex: 1 }}>
            <div style={{ font: '600 13px Inter, system-ui', color: '#363643' }}>{chain.chain}</div>
            <div style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>
              {rows.length} {rows.length === 1 ? 'account' : 'accounts'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ font: '700 14px Manrope', letterSpacing: '-0.01em', color: '#363643' }}>
              {grandToken.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: tokenDigits })} {chain.token}
            </div>
            <div style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>
              ${grandValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div style={{
            padding: '28px 14px', textAlign: 'center',
            font: '500 12px Inter, system-ui', color: '#79797D',
          }}>
            No reward data for this chain.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px' }}>
              <HoverableDonut
                items={donutItems}
                size={170}
                thickness={32}
                renderCenter={() => (
                  <>
                    <div style={{ font: '500 10px Inter, system-ui', color: '#79797D' }}>{periodCfg.label}</div>
                    <div style={{ font: '700 14px Manrope', letterSpacing: '-0.01em', color: '#363643' }}>
                      ${grandValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ font: '500 10px Inter, system-ui', color: '#79797D', marginTop: 1 }}>total</div>
                  </>
                )}
              />
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: COL, gap: 10,
              padding: '8px 4px', borderBottom: '0.5px solid rgba(69,69,137,0.06)',
              alignItems: 'center',
            }}>
              <span style={{
                font: '600 10px Inter, system-ui', color: '#A4A4AD',
                letterSpacing: '.5px', textTransform: 'uppercase',
              }}>Account</span>
              <SortableHeader label="Rewards" tooltip="Rewards earned in the selected period" sortKey="rewards" sort={sort} onChange={setSort} />
              <SortableHeader label="Value"   tooltip="Fiat value at current price"           sortKey="value"   sort={sort} onChange={setSort} />
              <SortableHeader label="Share"   tooltip="Share of chain rewards"                sortKey="share"   sort={sort} onChange={setSort} />
            </div>

            {sorted.map((r, i) => (
              <div
                key={r.id}
                style={{
                  display: 'grid', gridTemplateColumns: COL, gap: 10,
                  padding: '10px 4px', alignItems: 'center',
                  borderTop: i === 0 ? 'none' : '0.5px solid rgba(69,69,137,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: colorForAccount(r.id), flexShrink: 0 }} />
                  <img src={r.acc.wallet.icon} style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ font: '600 12px Inter, system-ui', color: '#363643' }}>
                      {r.acc.wallet.name} · {r.acc.name}
                    </div>
                    <div style={{ font: '500 11px JetBrains Mono, monospace', color: '#79797D' }}>{r.acc.addr}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', font: '600 12px Inter, system-ui' }}>
                  {r.rewards.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: tokenDigits })} {chain.token}
                </div>
                <div style={{ textAlign: 'right', font: '500 12px Inter, system-ui', color: '#79797D' }}>
                  ${r.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </div>
                <div style={{ textAlign: 'right', font: '600 12px Inter, system-ui' }}>
                  {(r.share * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </NSModal>
  );
};

// ============================ CLAIM REWARDS FLOW ============================

const getUnclaimedRewards = (selectedIds) => {
  const rows = [];
  for (const accountId of Array.from(selectedIds)) {
    const acc = ACCOUNT_BY_ID[accountId];
    if (!acc) continue;
    for (const chain of CHAIN_STAKES) {
      const pos = chain.positions.find(p => p.accountId === accountId);
      if (!pos) continue;
      const validators = getValidatorsFor(accountId, chain.chainId, pos.elected, pos.validators).filter(v => v.elected);
      const seed = (accountId + chain.chainId + 'claim').split('').reduce((a, c) => ((a * 31 + c.charCodeAt(0)) | 0), 3);
      const rand = seededRand(seed);
      for (const v of validators) {
        if (rand() < 0.4) {
          const eraCount = 1 + Math.floor(rand() * 3);
          const startEra = chain.token === 'KSM' ? 6800 : 1546;
          const eraList = Array.from({ length: eraCount }, (_, k) => startEra + Math.floor(rand() * 6) + k);
          const perEra = chain.token === 'KSM' ? 0.02 + rand() * 0.08 : 0.3 + rand() * 1.6;
          const amount = +(perEra * eraCount).toFixed(chain.token === 'KSM' ? 4 : 3);
          rows.push({
            id: `${accountId}-${chain.chainId}-${v.id}`,
            chain, accountId, account: acc, validator: v,
            eraList, amount,
          });
        }
      }
    }
  }
  return rows;
};

const UnclaimedRewardsModal = ({ open, onClose }) => {
  const f = useWalletFilter();
  const rows = React.useMemo(() => (open ? getUnclaimedRewards(f.selected) : []), [open, f.selected]);
  const [processed, setProcessed] = React.useState(() => new Map()); // id -> 'claimed' | 'drafted'
  const [selected, setSelected] = React.useState(() => new Set());
  const [payerOpen, setPayerOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setProcessed(new Map());
    setSelected(new Set(rows.map(r => r.id)));
    setPayerOpen(false);
  }, [open, rows]);

  const chainGroups = React.useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.chain.chainId)) map.set(r.chain.chainId, { chain: r.chain, items: [] });
      map.get(r.chain.chainId).items.push(r);
    }
    return Array.from(map.values());
  }, [rows]);

  const selectedRows = rows.filter(r => selected.has(r.id) && !processed.has(r.id));
  const totalsByToken = {};
  let totalFiat = 0;
  for (const r of selectedRows) {
    totalsByToken[r.chain.token] = (totalsByToken[r.chain.token] || 0) + r.amount;
    totalFiat += r.amount * r.chain.price;
  }
  const totalsLabel = Object.entries(totalsByToken)
    .map(([t, v]) => `${v.toFixed(t === 'KSM' ? 4 : 3)} ${t}`)
    .join(' · ');

  const toggleRow = (id) => {
    if (processed.has(id)) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleChain = (items) => {
    const unproc = items.filter(r => !processed.has(r.id));
    if (unproc.length === 0) return;
    const allOn = unproc.every(r => selected.has(r.id));
    setSelected(prev => {
      const next = new Set(prev);
      for (const r of unproc) {
        if (allOn) next.delete(r.id);
        else next.add(r.id);
      }
      return next;
    });
  };

  const claimOne = (r) => {
    const kind = f.isWatchOnlyAccount(r.accountId) ? 'drafted' : 'claimed';
    setProcessed(prev => {
      const next = new Map(prev);
      next.set(r.id, kind);
      return next;
    });
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(r.id);
      return next;
    });
  };

  const submitBatch = (payerAccountId) => {
    const payer = ACCOUNT_BY_ID[payerAccountId];
    const kind = payer && payer.wallet && payer.wallet.watchOnly ? 'drafted' : 'claimed';
    setProcessed(prev => {
      const next = new Map(prev);
      for (const id of selected) if (!next.has(id)) next.set(id, kind);
      return next;
    });
    setSelected(new Set());
    setPayerOpen(false);
  };

  const subtitle = rows.length === 0
    ? 'No unclaimed rewards for the selected accounts.'
    : selectedRows.length === 0
      ? `${processed.size} of ${rows.length} processed`
      : `${totalsLabel} · $${totalFiat.toFixed(2)} · ${selectedRows.length} ${selectedRows.length === 1 ? 'payout' : 'payouts'}`;

  const footer = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>
        {rows.length === 0
          ? '—'
          : `${selectedRows.length} selected · ${processed.size} processed`}
      </span>
      <span style={{ flex: 1 }} />
      <NSButton variant="secondary" onClick={onClose}>Close</NSButton>
      <NSButton
        variant="primary"
        onClick={() => setPayerOpen(true)}
        disabled={selectedRows.length === 0}
      >
        Claim · {selectedRows.length}
      </NSButton>
    </div>
  );

  return (
    <>
      <NSModal
        open={open}
        onClose={onClose}
        title="Claim rewards"
        subtitle={subtitle}
        width={600}
        footer={footer}
      >
        {rows.length === 0 ? (
          <div style={{
            padding: '24px 16px', textAlign: 'center',
            font: '500 12px Inter, system-ui', color: '#79797D',
          }}>
            No unclaimed rewards for the currently selected accounts. Try another preset.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chainGroups.map(({ chain, items }) => {
              const chainRemaining = items.filter(r => !processed.has(r.id));
              const chainRemainingTotal = chainRemaining
                .filter(r => selected.has(r.id))
                .reduce((s, r) => s + r.amount, 0);
              const chainAllOn = chainRemaining.length > 0 && chainRemaining.every(r => selected.has(r.id));
              const chainNoneOn = chainRemaining.every(r => !selected.has(r.id));
              const chainState =
                chainRemaining.length === 0 ? 'unchecked'
                : chainAllOn ? 'checked'
                : chainNoneOn ? 'unchecked'
                : 'indeterminate';

              return (
                <NSPlate key={chain.chainId} padding="0">
                  <button
                    onClick={() => toggleChain(items)}
                    disabled={chainRemaining.length === 0}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      padding: '10px 14px', borderBottom: '0.5px solid rgba(69,69,137,0.06)',
                      background: 'rgba(69,69,137,0.02)',
                      border: 0, textAlign: 'left',
                      cursor: chainRemaining.length === 0 ? 'default' : 'pointer',
                    }}
                  >
                    <FilterCheckbox state={chainState} />
                    <ChainIcon chain={chain.chain} size={20} />
                    <div style={{ font: '600 12px Inter, system-ui', color: '#363643', flex: 1 }}>
                      {chain.chain}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ font: '600 12px Inter, system-ui', color: '#363643' }}>
                        {chainRemainingTotal.toFixed(chain.token === 'KSM' ? 4 : 3)} {chain.token}
                      </div>
                      <div style={{ font: '500 10px Inter, system-ui', color: '#79797D' }}>
                        ${(chainRemainingTotal * chain.price).toFixed(2)}
                      </div>
                    </div>
                  </button>
                  {items.map((r, i) => {
                    const status = processed.get(r.id);
                    const isProcessed = !!status;
                    const isOn = selected.has(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => !isProcessed && toggleRow(r.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px',
                          borderTop: i === 0 ? 'none' : '0.5px solid rgba(69,69,137,0.04)',
                          opacity: isProcessed ? 0.5 : 1,
                          cursor: isProcessed ? 'default' : 'pointer',
                        }}
                      >
                        <FilterCheckbox state={isProcessed ? 'unchecked' : isOn ? 'checked' : 'unchecked'} />
                        <Identicon seed={r.validator.id} size={22} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              font: '600 12px Inter, system-ui', color: '#363643',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{r.validator.name}</span>
                            <ValidatorMarks v={r.validator} />
                          </div>
                          <div style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>
                            {r.account.wallet.name} · {r.account.name} · Era {r.eraList.join(', ')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ font: '600 12px Inter, system-ui', color: '#363643' }}>
                            {r.amount.toFixed(chain.token === 'KSM' ? 4 : 3)} {chain.token}
                          </div>
                          <div style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>
                            ${(r.amount * chain.price).toFixed(2)}
                          </div>
                        </div>
                        {isProcessed ? (
                          <NSBadge tone="green">{status === 'drafted' ? 'Drafted' : 'Claimed'}</NSBadge>
                        ) : (
                          <NSButton
                            variant="secondary"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); claimOne(r); }}
                          >
                            {f.isWatchOnlyAccount(r.accountId) ? 'Draft' : 'Claim'}
                          </NSButton>
                        )}
                      </div>
                    );
                  })}
                </NSPlate>
              );
            })}
          </div>
        )}
      </NSModal>
      <ClaimPayerModal
        open={payerOpen}
        onClose={() => setPayerOpen(false)}
        count={selectedRows.length}
        totalsLabel={totalsLabel}
        totalFiat={totalFiat}
        onSubmit={submitBatch}
      />
    </>
  );
};

const ClaimPayerModal = ({ open, onClose, count, totalsLabel, totalFiat, onSubmit }) => {
  const [payerId, setPayerId] = React.useState(null);
  React.useEffect(() => { if (open) setPayerId(null); }, [open]);

  const payer = payerId ? ACCOUNT_BY_ID[payerId] : null;
  const isDraft = !!(payer && payer.wallet && payer.wallet.watchOnly);

  const footer = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>
        {payer
          ? (isDraft ? 'Draft will be prepared for the signer.' : 'Fees paid by the selected account.')
          : 'Select a payer account.'}
      </span>
      <span style={{ flex: 1 }} />
      <NSButton variant="secondary" onClick={onClose}>Back</NSButton>
      <NSButton variant="primary" disabled={!payer} onClick={() => onSubmit(payerId)}>
        {isDraft ? `Create draft · ${count}` : `Claim · ${count}`}
      </NSButton>
    </div>
  );

  return (
    <NSModal
      open={open}
      onClose={onClose}
      title="Choose payer account"
      subtitle={count > 0
        ? `${count} ${count === 1 ? 'payout' : 'payouts'} · ${totalsLabel} · $${totalFiat.toFixed(2)}`
        : undefined}
      width={520}
      footer={footer}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {DASH_WALLETS.map(w => (
          <div key={w.id}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              font: '600 10px Inter, system-ui', color: '#A4A4AD',
              letterSpacing: '.5px', textTransform: 'uppercase',
              padding: '0 2px 6px',
            }}>
              <img src={w.icon} style={{ width: 14, height: 14, borderRadius: 3 }} />
              <span>{w.name}</span>
              {w.readOnly ? (
                <NSBadge tone="gray" style={{ marginLeft: 2 }}>Read-only</NSBadge>
              ) : w.watchOnly ? (
                <NSBadge tone="purple" style={{ marginLeft: 2 }}>Draft only</NSBadge>
              ) : null}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {w.accounts.map(a => {
                const active = payerId === a.id;
                const isReadOnly = !!(w.readOnly || a.readOnly);
                const btn = (
                  <button
                    key={a.id}
                    disabled={isReadOnly}
                    onClick={() => { if (!isReadOnly) setPayerId(a.id); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      background: '#fff', borderRadius: 10,
                      cursor: isReadOnly ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      border: `1.5px solid ${active ? '#4649F6' : 'rgba(69,69,137,0.08)'}`,
                      boxShadow: active ? '0 0 0 3px rgba(70,73,246,0.12)' : 'none',
                      opacity: isReadOnly ? 0.55 : 1,
                      width: '100%',
                    }}
                  >
                    <Identicon seed={a.id} size={22} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: '600 12px Inter, system-ui', color: '#363643' }}>
                        {a.name}
                      </div>
                      <div style={{ font: '500 11px JetBrains Mono, monospace', color: '#79797D' }}>
                        {a.addr}
                      </div>
                    </div>
                    {isReadOnly
                      ? <NSBadge tone="gray">Read-only</NSBadge>
                      : w.watchOnly ? <NSBadge tone="purple">Address book</NSBadge>
                      : null}
                  </button>
                );
                return isReadOnly
                  ? <InfoTooltip key={a.id} content={readOnlyTip(a.addr)} width={240} block>{btn}</InfoTooltip>
                  : btn;
              })}
            </div>
          </div>
        ))}
      </div>
    </NSModal>
  );
};

// ============================ START STAKING FLOW ============================

// Dark tooltip rendered into document.body via portal so it always paints
// on top of scroll containers and modals, regardless of overflow clipping.
const InfoTooltip = ({ content, children, side = 'top', width = 220, block = false }) => {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef(null);
  const [rect, setRect] = React.useState(null);

  const show = () => {
    if (anchorRef.current) setRect(anchorRef.current.getBoundingClientRect());
    setOpen(true);
  };
  const hide = () => setOpen(false);

  const gap = 8;
  const tip = open && rect ? (() => {
    const cx = rect.left + rect.width / 2;
    const cy = side === 'top' ? rect.top - gap : rect.bottom + gap;
    return { left: cx, top: cy };
  })() : null;

  const wrapStyle = block
    ? { display: 'block' }
    : { display: 'inline-flex', alignItems: 'center' };

  return (
    <>
      <span
        ref={anchorRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={wrapStyle}
      >
        {children}
      </span>
      {tip && ReactDOM.createPortal(
        <div style={{
          position: 'fixed', zIndex: 9999,
          top: tip.top, left: tip.left,
          transform: `translate(-50%, ${side === 'top' ? '-100%' : '0'})`,
          background: '#2F2F40', color: '#fff',
          borderRadius: 6, padding: '6px 9px',
          font: '500 11px Inter, system-ui', lineHeight: 1.35,
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          width, maxWidth: 'calc(100vw - 16px)', textAlign: 'left',
          pointerEvents: 'none', whiteSpace: 'normal',
        }}>{content}</div>,
        document.body,
      )}
    </>
  );
};

const VALIDATOR_MARKS = {
  slashed: {
    label: 'Slashed',
    shortcut: 'S',
    bg: '#FEDDE6', fg: '#F52163',
    tooltip: 'This validator was slashed in the last 30 days.',
  },
  oversubscribed: {
    label: 'Oversubscribed',
    shortcut: 'O',
    bg: '#FEEDDD', fg: '#F68F07',
    tooltip: 'Many nominators back this validator — your stake may fall outside the active set.',
  },
  chilled: {
    label: 'Chilled',
    shortcut: 'C',
    bg: '#E1E2E6', fg: '#79797D',
    tooltip: 'Validator is currently inactive or blocks nominations.',
  },
};

const ValidatorMark = ({ type }) => {
  const m = VALIDATOR_MARKS[type];
  if (!m) return null;
  return (
    <InfoTooltip content={m.tooltip} width={220}>
      <span style={{
        width: 16, height: 16, borderRadius: 4,
        background: m.bg, color: m.fg,
        font: '700 10px Inter, system-ui',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, cursor: 'help',
      }}>{m.shortcut}</span>
    </InfoTooltip>
  );
};

const ValidatorMarks = ({ v }) => {
  const kinds = [];
  if (v.slashed) kinds.push('slashed');
  if (v.oversubscribed) kinds.push('oversubscribed');
  if (v.chilled) kinds.push('chilled');
  if (kinds.length === 0) return null;
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {kinds.map(k => <ValidatorMark key={k} type={k} />)}
    </span>
  );
};

const FilterToggleRow = ({ checked, onToggle, children }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '8px 12px', border: 0, cursor: 'pointer', textAlign: 'left',
        borderRadius: 8, background: hover ? 'rgba(69,69,137,0.04)' : 'transparent',
      }}
    >
      <FilterCheckbox state={checked ? 'checked' : 'unchecked'} />
      <span style={{ flex: 1, font: '500 12px Inter, system-ui', color: '#363643' }}>{children}</span>
    </button>
  );
};

const FilterNumField = ({ label, suffix, valueStr, onValue, placeholder }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 12px' }}>
    <span style={{ flex: 1, font: '500 12px Inter, system-ui', color: '#363643' }}>{label}</span>
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: '#fff', borderRadius: 6, padding: '4px 8px',
      boxShadow: 'inset 0 0 0 1px rgba(69,69,137,0.08)',
      width: 96,
    }}>
      <input
        value={valueStr}
        onChange={(e) => onValue(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder={placeholder}
        inputMode="decimal"
        style={{
          border: 0, outline: 0, background: 'transparent',
          width: '100%', minWidth: 0,
          font: '500 12px Inter, system-ui', color: '#363643', textAlign: 'right',
        }}
      />
      {suffix && <span style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>{suffix}</span>}
    </div>
  </div>
);

const ValidatorFilterPopover = ({ value, onChange, activeCount }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const set = (patch) => onChange({ ...value, ...patch });
  const resetAll = () => onChange({
    hideSlashed: false, hideOversubscribed: false, hideChilled: false,
    minApy: '', maxNominators: '', minBlocks: '',
  });

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Filter"
        style={{
          width: 30, height: 30, border: 0, borderRadius: 8, cursor: 'pointer',
          background: activeCount > 0 ? '#4649F6' : (open ? 'rgba(70,73,246,0.12)' : 'rgba(69,69,137,0.06)'),
          color: activeCount > 0 ? '#fff' : '#363643',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}
      >
        <NSIcon
          src="../../assets/icons/func/filter.svg"
          size={14}
          style={{
            opacity: activeCount > 0 ? 1 : 0.7,
            filter: activeCount > 0 ? 'brightness(0) invert(1)' : 'none',
          }}
        />
        {activeCount > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 6, height: 6, borderRadius: '50%',
            background: '#F52163',
            boxShadow: '0 0 0 1.5px #fff',
          }} />
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 30,
          width: 288, background: '#fff', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(24,24,45,0.14)',
          border: '0.5px solid rgba(69,69,137,0.08)',
          padding: '6px 0',
        }}>
          <div style={{
            padding: '8px 12px',
            font: '600 10px Inter, system-ui', color: '#79797D',
            letterSpacing: '.5px', textTransform: 'uppercase',
          }}>Hide validators</div>
          <FilterToggleRow checked={value.hideSlashed} onToggle={() => set({ hideSlashed: !value.hideSlashed })}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ValidatorMark type="slashed" /> Slashed
            </span>
          </FilterToggleRow>
          <FilterToggleRow checked={value.hideOversubscribed} onToggle={() => set({ hideOversubscribed: !value.hideOversubscribed })}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ValidatorMark type="oversubscribed" /> Oversubscribed
            </span>
          </FilterToggleRow>
          <FilterToggleRow checked={value.hideChilled} onToggle={() => set({ hideChilled: !value.hideChilled })}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ValidatorMark type="chilled" /> Chilled
            </span>
          </FilterToggleRow>

          <div style={{ borderTop: '0.5px solid rgba(69,69,137,0.06)', margin: '6px 0' }} />

          <div style={{
            padding: '4px 12px 6px',
            font: '600 10px Inter, system-ui', color: '#79797D',
            letterSpacing: '.5px', textTransform: 'uppercase',
          }}>Thresholds</div>
          <FilterNumField label="Min APY"         suffix="%" placeholder="0"   valueStr={value.minApy}        onValue={(v) => set({ minApy: v })} />
          <FilterNumField label="Max nominators"             placeholder="500" valueStr={value.maxNominators} onValue={(v) => set({ maxNominators: v })} />
          <FilterNumField label="Min blocks"                 placeholder="0"   valueStr={value.minBlocks}     onValue={(v) => set({ minBlocks: v })} />

          <div style={{
            display: 'flex', alignItems: 'center',
            padding: '8px 12px', borderTop: '0.5px solid rgba(69,69,137,0.06)', marginTop: 6,
          }}>
            <button
              onClick={resetAll}
              disabled={activeCount === 0}
              style={{
                border: 0, background: 'transparent', cursor: activeCount === 0 ? 'default' : 'pointer',
                font: '600 11px Inter, system-ui', color: activeCount === 0 ? '#A4A4AD' : '#4649F6',
                padding: '4px 6px',
              }}
            >Reset</button>
            <span style={{ flex: 1 }} />
            <button
              onClick={() => setOpen(false)}
              style={{
                border: 0, background: '#4649F6', borderRadius: 8,
                padding: '6px 12px', cursor: 'pointer',
                font: '600 11px Inter, system-ui', color: '#fff',
              }}
            >Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

// Sortable table-header cell. active sort indicated by filled arrow;
// click toggles asc → desc → off.
const SortableHeader = ({ label, tooltip, sortKey, sort, onChange, align = 'right' }) => {
  const active = sort.key === sortKey;
  const dir = active ? sort.dir : null;
  const onClick = () => {
    if (!active) onChange({ key: sortKey, dir: 'desc' });
    else if (sort.dir === 'desc') onChange({ key: sortKey, dir: 'asc' });
    else onChange({ key: null, dir: null });
  };
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        border: 0, background: 'transparent', cursor: 'pointer',
        font: '600 10px Inter, system-ui', color: active ? '#363643' : '#A4A4AD',
        letterSpacing: '.5px', textTransform: 'uppercase',
        padding: 0, marginLeft: align === 'right' ? 'auto' : 0,
        marginRight: align === 'left' ? 'auto' : 0,
      }}
    >
      {tooltip ? (
        <InfoTooltip content={tooltip} width={200}>
          <span style={{ borderBottom: '1px dotted currentColor', paddingBottom: 1 }}>{label}</span>
        </InfoTooltip>
      ) : (
        <span>{label}</span>
      )}
      <span style={{
        display: 'inline-flex', flexDirection: 'column',
        font: '700 8px Inter', lineHeight: 1, color: '#A4A4AD',
      }}>
        <span style={{ color: dir === 'asc' ? '#4649F6' : '#D2D2D8' }}>▲</span>
        <span style={{ color: dir === 'desc' ? '#4649F6' : '#D2D2D8', marginTop: -1 }}>▼</span>
      </span>
    </button>
  );
};


// Per-account per-chain available balance — deterministic mock
const availableBalance = (accountId, chainId) => {
  const seed = (accountId + chainId).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 17);
  const rand = seededRand(seed);
  const chain = CHAIN_STAKES.find(c => c.chainId === chainId);
  const base = chain.token === 'DOT' ? 100 + rand() * 3000 : 0.5 + rand() * 20;
  return +base.toFixed(3);
};

const MIN_BOND = { 'polkadot-ah': 10, 'kusama-ah': 0.1 };
const FEE = { DOT: 0.015, KSM: 0.0008 };

const StepDots = ({ step, total = 3 }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    {Array.from({ length: total }, (_, i) => {
      const n = i + 1;
      const done = step > n;
      const active = step === n;
      return (
        <React.Fragment key={n}>
          <span style={{
            width: 20, height: 20, borderRadius: '50%',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: done ? '#01A63E' : active ? '#4649F6' : 'rgba(69,69,137,0.08)',
            color: done || active ? '#fff' : '#79797D',
            font: '600 10px Inter, system-ui',
          }}>
            {done ? '✓' : n}
          </span>
          {n < total && (
            <span style={{
              width: 18, height: 2, borderRadius: 2,
              background: done ? '#01A63E' : 'rgba(69,69,137,0.08)',
            }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const StartStakingFlow = ({ open, onClose }) => {
  const [step, setStep] = React.useState(1);
  const [accountId, setAccountId] = React.useState(null);
  const [chainId, setChainId] = React.useState(null);
  const [amount, setAmount] = React.useState('');
  const [chosen, setChosen] = React.useState(() => new Set());
  const [search, setSearch] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [vFilter, setVFilter] = React.useState({
    hideSlashed: false, hideOversubscribed: false, hideChilled: false,
    minApy: '', maxNominators: '', minBlocks: '',
  });

  React.useEffect(() => {
    if (!open) return;
    setStep(1); setAccountId(null); setChainId(null);
    setAmount(''); setChosen(new Set()); setSearch('');
    setVFilter({ hideSlashed: false, hideOversubscribed: false, hideChilled: false, minApy: '', maxNominators: '', minBlocks: '' });
    setSubmitted(false);
  }, [open]);

  const chain = chainId ? CHAIN_STAKES.find(c => c.chainId === chainId) : null;
  const account = accountId ? ACCOUNT_BY_ID[accountId] : null;
  const draftMode = !!(account && account.wallet && account.wallet.watchOnly);
  const balance = accountId && chainId ? availableBalance(accountId, chainId) : 0;
  const amountNum = parseFloat(amount) || 0;
  const fee = chain ? FEE[chain.token] : 0;
  const minBond = chainId ? MIN_BOND[chainId] : 0;
  const tooLow = amountNum > 0 && amountNum < minBond;
  const tooHigh = amountNum + fee > balance;
  const amountValid = amountNum > 0 && !tooLow && !tooHigh;

  const MAX_VALIDATORS = 16;
  const VALIDATOR_POOL_SIZE = 30;
  const pool = React.useMemo(() => {
    if (!chainId) return [];
    return getValidatorsFor('pool', chainId, 24, VALIDATOR_POOL_SIZE);
  }, [chainId]);
  const recommended = React.useMemo(
    () => pool.slice().sort((a, b) => b.apy - a.apy).slice(0, MAX_VALIDATORS),
    [pool],
  );
  const minApyNum = parseFloat(vFilter.minApy);
  const maxNomsNum = parseFloat(vFilter.maxNominators);
  const minBlocksNum = parseFloat(vFilter.minBlocks);
  const activeFilterCount =
    (vFilter.hideSlashed ? 1 : 0) +
    (vFilter.hideOversubscribed ? 1 : 0) +
    (vFilter.hideChilled ? 1 : 0) +
    (Number.isFinite(minApyNum) ? 1 : 0) +
    (Number.isFinite(maxNomsNum) ? 1 : 0) +
    (Number.isFinite(minBlocksNum) ? 1 : 0);

  const filteredPool = pool.filter(v => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (vFilter.hideSlashed && v.slashed) return false;
    if (vFilter.hideOversubscribed && v.oversubscribed) return false;
    if (vFilter.hideChilled && v.chilled) return false;
    if (Number.isFinite(minApyNum) && v.apy < minApyNum) return false;
    if (Number.isFinite(maxNomsNum) && v.nominators > maxNomsNum) return false;
    if (Number.isFinite(minBlocksNum) && v.producedBlocks < minBlocksNum) return false;
    return true;
  });
  const chosenArr = pool.filter(v => chosen.has(v.id));
  const finalValidators = chosenArr;

  const canNext =
    step === 1 ? !!accountId && !!chainId :
    step === 2 ? amountValid :
    step === 3 ? (chosen.size > 0 && chosen.size <= MAX_VALIDATORS) : false;

  const onBack = () => setStep(s => Math.max(1, s - 1));
  const onNext = () => {
    if (!canNext) return;
    if (step < 3) { setStep(s => s + 1); return; }
    setSubmitted(true);
  };

  const pctButton = (pct) => {
    const v = Math.max(0, balance - fee) * (pct / 100);
    setAmount(v.toFixed(chain.token === 'KSM' ? 4 : 3));
  };

  const toggleValidator = (id) => setChosen(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else if (next.size < MAX_VALIDATORS) next.add(id);
    return next;
  });
  const fillWithRecommended = () => setChosen(prev => {
    const next = new Set(prev);
    for (const v of recommended) {
      if (next.size >= MAX_VALIDATORS) break;
      next.add(v.id);
    }
    return next;
  });

  // --- Step bodies ---
  const Step1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ font: '600 12px Inter, system-ui', color: '#363643', marginBottom: 8 }}>Network</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {CHAIN_STAKES.map(c => {
            const active = chainId === c.chainId;
            return (
              <button
                key={c.chainId}
                onClick={() => { setChainId(c.chainId); setAccountId(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  background: '#fff', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  border: `1.5px solid ${active ? '#4649F6' : 'rgba(69,69,137,0.08)'}`,
                  boxShadow: active ? '0 0 0 3px rgba(70,73,246,0.12)' : 'none',
                }}
              >
                <ChainIcon chain={c.chain} size={28} />
                <div style={{ flex: 1 }}>
                  <div style={{ font: '600 13px Inter' }}>{c.chain}</div>
                  <div style={{ font: '500 11px Inter', color: '#79797D' }}>{c.apy}% APY · min {minBond || MIN_BOND[c.chainId]} {c.token}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {chainId && (
        <div>
          <div style={{ font: '600 12px Inter, system-ui', color: '#363643', marginBottom: 8 }}>Account</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflow: 'auto' }}>
            {DASH_WALLETS.flatMap(w => w.accounts.map(a => ({ ...a, wallet: w }))).map(a => {
              const bal = availableBalance(a.id, chainId);
              const active = accountId === a.id;
              const isReadOnly = !!(a.wallet.readOnly || a.readOnly);
              const lowBal = bal < (MIN_BOND[chainId] + FEE[chain.token]);
              const disabled = isReadOnly || lowBal;
              const btn = (
                <button
                  key={a.id}
                  disabled={disabled}
                  onClick={() => { if (!disabled) setAccountId(a.id); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    background: '#fff', borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
                    textAlign: 'left', border: `1.5px solid ${active ? '#4649F6' : 'rgba(69,69,137,0.08)'}`,
                    opacity: disabled ? 0.45 : 1,
                    width: '100%',
                  }}
                >
                  <img src={a.wallet.icon} style={{ width: 22, height: 22, borderRadius: 5 }} />
                  <Identicon seed={a.id} size={22} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '600 12px Inter, system-ui', color: '#363643' }}>
                      {a.wallet.name} · {a.name}
                    </div>
                    <div style={{ font: '500 11px JetBrains Mono, monospace', color: '#79797D' }}>{a.addr}</div>
                  </div>
                  {isReadOnly && <NSBadge tone="gray">Read-only</NSBadge>}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ font: '600 12px Inter' }}>{bal.toLocaleString('en-US', { maximumFractionDigits: 3 })} {chain.token}</div>
                    <div style={{ font: '500 10px Inter', color: '#79797D' }}>available</div>
                  </div>
                </button>
              );
              return isReadOnly
                ? <InfoTooltip key={a.id} content={readOnlyTip(a.addr)} width={240} block>{btn}</InfoTooltip>
                : btn;
            })}
          </div>
        </div>
      )}
    </div>
  );

  const Step2 = () => {
    const projectedYear = amountNum * chain.apy / 100;
    const projectedMonth = projectedYear / 12;
    const projectedDay = projectedYear / 365;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <NSPlate padding="10px 12px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ChainIcon chain={chain.chain} size={24} />
            <div style={{ flex: 1 }}>
              <div style={{ font: '600 12px Inter' }}>{chain.chain}</div>
              <div style={{ font: '500 11px Inter', color: '#79797D' }}>{account.wallet.name} · {account.name}</div>
            </div>
            <img src={account.wallet.icon} style={{ width: 22, height: 22, borderRadius: 5 }} />
          </div>
        </NSPlate>

        <NSField
          label="Amount"
          right={
            <span style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>
              Available: {balance.toLocaleString('en-US', { maximumFractionDigits: 3 })} {chain.token}
            </span>
          }
          error={tooLow ? `Minimum ${minBond} ${chain.token}` : tooHigh ? 'Not enough balance' : null}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            background: '#fff', borderRadius: 10,
            boxShadow: amountValid
              ? 'inset 0 0 0 1px rgba(69,69,137,0.08)'
              : tooLow || tooHigh
                ? 'inset 0 0 0 1.5px #F52163'
                : 'inset 0 0 0 1px rgba(69,69,137,0.08)',
          }}>
            <input
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              inputMode="decimal"
              style={{
                border: 0, outline: 0, background: 'transparent', flex: 1,
                font: '700 18px Manrope', letterSpacing: '-0.01em', color: '#363643',
              }}
            />
            <span style={{ font: '600 13px Inter', color: '#79797D' }}>{chain.token}</span>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {[25, 50, 75, 100].map(p => (
              <button key={p} onClick={() => pctButton(p)} style={{
                flex: 1, padding: '5px 0', border: 0, borderRadius: 6, cursor: 'pointer',
                background: 'rgba(69,69,137,0.06)', color: '#363643',
                font: '600 11px Inter, system-ui',
              }}>{p === 100 ? 'Max' : `${p}%`}</button>
            ))}
          </div>
        </NSField>

        <NSPlate padding="0">
          {[
            ['Estimated reward (APY)', <span style={{ color: '#01A63E' }}>{chain.apy}%</span>],
            ['Per day',   `${projectedDay.toFixed(chain.token === 'KSM' ? 4 : 3)} ${chain.token}`],
            ['Per month', `${projectedMonth.toFixed(chain.token === 'KSM' ? 4 : 2)} ${chain.token}`],
            ['Per year',  `${projectedYear.toFixed(chain.token === 'KSM' ? 4 : 2)} ${chain.token}`],
            ['Network fee', `${fee} ${chain.token}`],
            ['Unbonding period', chain.token === 'KSM' ? '7 days' : '28 days'],
          ].map(([k, v], i) => (
            <div key={k} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              borderTop: i === 0 ? 'none' : '0.5px solid rgba(69,69,137,0.06)',
            }}>
              <div style={{ font: '500 12px Inter, system-ui', color: '#79797D', flex: 1 }}>{k}</div>
              <div style={{ font: '600 12px Inter, system-ui', color: '#363643' }}>{v}</div>
            </div>
          ))}
        </NSPlate>
      </div>
    );
  };

  const [sort, setSort] = React.useState({ key: 'apy', dir: 'desc' });
  const sortedPool = React.useMemo(() => {
    const arr = filteredPool.slice();
    if (!sort.key) return arr;
    const mul = sort.dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const av = a[sort.key] ?? 0;
      const bv = b[sort.key] ?? 0;
      return av < bv ? -1 * mul : av > bv ? 1 * mul : 0;
    });
    return arr;
  }, [filteredPool, sort]);

  const STEP3_COLS = '20px minmax(220px, 1fr) 68px 64px 76px 120px 56px';

  const Step3 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search validators" width={240} />
        <span style={{ flex: 1 }} />
        <ValidatorFilterPopover value={vFilter} onChange={setVFilter} activeCount={activeFilterCount} />
        <button
          onClick={fillWithRecommended}
          style={{
            border: 0, background: 'rgba(69,69,137,0.06)', borderRadius: 8,
            padding: '6px 10px', cursor: 'pointer',
            font: '600 11px Inter, system-ui', color: '#363643',
          }}
        >Recommended</button>
        <button
          onClick={() => setChosen(new Set())}
          style={{
            border: 0, background: 'transparent', cursor: 'pointer',
            font: '600 11px Inter, system-ui', color: '#79797D', padding: '6px 8px',
          }}
        >Clear</button>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 2px', font: '500 11px Inter, system-ui', color: '#79797D',
      }}>
        <span>Selected: <b style={{ color: '#363643' }}>{chosen.size}</b> / {MAX_VALIDATORS}</span>
        <span style={{ flex: 1 }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {['slashed', 'oversubscribed', 'chilled'].map(k => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ValidatorMark type={k} />
              <span style={{ font: '500 10px Inter, system-ui', color: '#79797D' }}>
                {VALIDATOR_MARKS[k].label}
              </span>
            </span>
          ))}
        </span>
      </div>

      <div style={{
        borderRadius: 10, border: '0.5px solid rgba(69,69,137,0.08)',
        background: '#fff', overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: STEP3_COLS, gap: 10,
          padding: '10px 12px', borderBottom: '0.5px solid rgba(69,69,137,0.06)',
          alignItems: 'center',
        }}>
          <span />
          <span style={{ font: '600 10px Inter, system-ui', color: '#A4A4AD', letterSpacing: '.5px', textTransform: 'uppercase' }}>
            Validator
          </span>
          <SortableHeader label="APY"    tooltip="Estimated annual percentage yield based on the last era." sortKey="apy"            sort={sort} onChange={setSort} />
          <SortableHeader label="Blocks" tooltip="Blocks produced by the validator in the previous era."     sortKey="producedBlocks" sort={sort} onChange={setSort} />
          <SortableHeader label="Points" tooltip="Era points earned by the validator in the previous era."   sortKey="eraPoints"      sort={sort} onChange={setSort} />
          <SortableHeader label="Total stake" tooltip="Combined stake of this validator and its nominators." sortKey="totalStake"     sort={sort} onChange={setSort} />
          <SortableHeader label="Noms"   tooltip="Number of nominators backing this validator."              sortKey="nominators"     sort={sort} onChange={setSort} />
        </div>

        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          {sortedPool.length === 0 && (
            <div style={{ padding: '24px 12px', textAlign: 'center', font: '500 12px Inter, system-ui', color: '#79797D' }}>
              No validators match your search.
            </div>
          )}
          {sortedPool.map((v, i) => {
            const isOn = chosen.has(v.id);
            const canSelect = chosen.size < MAX_VALIDATORS || isOn;
            return (
              <div
                key={v.id}
                onClick={() => canSelect && toggleValidator(v.id)}
                style={{
                  display: 'grid', gridTemplateColumns: STEP3_COLS, gap: 10,
                  padding: '8px 12px', alignItems: 'center', cursor: canSelect ? 'pointer' : 'not-allowed',
                  borderTop: i === 0 ? 'none' : '0.5px solid rgba(69,69,137,0.04)',
                  opacity: canSelect ? 1 : 0.45,
                  background: isOn ? 'rgba(69,69,137,0.03)' : 'transparent',
                }}
              >
                <FilterCheckbox state={isOn ? 'checked' : 'unchecked'} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <Identicon seed={v.id} size={18} />
                  <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{
                        font: '600 12px Inter, system-ui', color: '#363643',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        minWidth: 0, flex: '0 1 auto',
                      }}>{v.name}</span>
                      <ValidatorMarks v={v} />
                    </div>
                    <div style={{
                      font: '500 10px JetBrains Mono, monospace', color: '#79797D',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{v.addr}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', font: '600 12px Inter, system-ui', color: '#01A63E' }}>
                  {v.apy.toFixed(2)}%
                </div>
                <div style={{ textAlign: 'right', font: '600 12px Inter, system-ui', color: '#363643' }}>
                  {v.producedBlocks}
                </div>
                <div style={{ textAlign: 'right', font: '600 12px Inter, system-ui', color: '#363643' }}>
                  {v.eraPoints.toLocaleString('en-US')}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ font: '600 12px Inter, system-ui', color: '#363643' }}>
                    {fmtCompact(v.totalStake)} {chain.token}
                  </div>
                  <div style={{ font: '500 10px Inter, system-ui', color: '#79797D' }}>
                    ${fmtCompact(v.totalStake * chain.price)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', font: '600 12px Inter, system-ui', color: '#363643' }}>
                  {v.nominators}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const Submitted = () => (
    <div style={{ textAlign: 'center', padding: '20px 10px 10px' }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: '#DAF1E1', color: '#01A63E',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        font: '700 24px Manrope', margin: '0 auto 14px',
      }}>✓</div>
      <div style={{ font: '700 18px Manrope', letterSpacing: '-0.02em', color: '#363643' }}>
        {draftMode ? 'Draft created' : 'Staking transaction signed'}
      </div>
      <div style={{ font: '500 12px Inter', color: '#79797D', marginTop: 6 }}>
        {draftMode
          ? `Draft prepared: stake ${amountNum.toLocaleString('en-US', { maximumFractionDigits: 3 })} ${chain.token} on ${chain.chain} with ${finalValidators.length} validators. Share the draft with the signer to complete this operation.`
          : `You are now staking ${amountNum.toLocaleString('en-US', { maximumFractionDigits: 3 })} ${chain.token} on ${chain.chain} with ${finalValidators.length} validators.`}
      </div>
    </div>
  );

  const primaryLabel =
    step === 1 ? 'Continue' :
    step === 2 ? 'Continue' :
    draftMode ? 'Create a draft' : 'Start staking';

  const footer = submitted ? (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <NSButton variant="primary" onClick={onClose}>Done</NSButton>
    </div>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <StepDots step={step} />
      <span style={{ flex: 1 }} />
      {step > 1 && (
        <NSButton variant="secondary" onClick={onBack}>Back</NSButton>
      )}
      <NSButton variant="primary" onClick={onNext} disabled={!canNext}>
        {primaryLabel}
      </NSButton>
    </div>
  );

  return (
    <NSModal
      open={open}
      onClose={onClose}
      title={submitted ? 'Success' : 'Start staking'}
      subtitle={submitted ? null :
        step === 1 ? 'Pick a network and an account with available balance.' :
        step === 2 ? 'Choose how much to stake.' :
        'Choose your validators.'
      }
      width={step === 3 && !submitted ? 780 : 560}
      footer={footer}
    >
      {submitted ? Submitted() :
        step === 1 ? Step1() :
        step === 2 ? Step2() : Step3()}
    </NSModal>
  );
};

// ============================ GOVERNANCE ============================

const REFS = [
  { id: 1452, chain: 'Polkadot', title: 'Treasury: Fund Polkadot Ambassador Program Q3',  track: 'Big Spender',  status: 'Deciding',   aye: 68, nay: 32, turnout: 42.1, deadline: '4d 12h',  my: 'Aye' },
  { id: 1451, chain: 'Kusama',   title: 'Runtime upgrade to v1.3.1',                       track: 'Root',         status: 'Confirming', aye: 92, nay: 8,  turnout: 12.6, deadline: '1d 08h',  my: null },
  { id: 1450, chain: 'Polkadot', title: 'Whitelist call for HRMP channel closure',          track: 'Whitelisted Caller', status: 'Deciding', aye: 54, nay: 46, turnout: 8.2, deadline: '6d 03h', my: 'Nay' },
  { id: 1449, chain: 'Polkadot', title: 'Grant: Nova Spektr v2 — multi-chain staking',      track: 'Medium Spender', status: 'Deciding', aye: 81, nay: 19, turnout: 18.4, deadline: '2d 20h', my: null },
  { id: 1448, chain: 'Kusama',   title: 'Bounty: Rust tooling maintenance',                 track: 'Small Tipper', status: 'Approved',  aye: 96, nay: 4,  turnout: 6.1,  deadline: 'Ended',  my: 'Aye' },
];
const TRACK_COLOR = {
  'Root': '#F52163', 'Big Spender': '#4649F6', 'Medium Spender': '#2795B6',
  'Small Tipper': '#01A63E', 'Whitelisted Caller': '#F68F07',
};

const VoteBar = ({ aye, nay }) => (
  <div style={{ height: 4, background: 'rgba(69,69,137,0.06)', borderRadius: 999, display: 'flex', overflow: 'hidden' }}>
    <div style={{ width: `${aye}%`, background: '#01A63E' }} />
    <div style={{ width: `${nay}%`, background: '#F52163' }} />
  </div>
);

const GovernanceView = () => {
  const [chain, setChain] = React.useState('all');
  const { scale, isNone } = useWalletFilter();
  const yourVotesCount = Math.round(4 * scale);
  const yourVotesTok = Math.round(18460 * scale).toLocaleString('en-US');
  const delegationsCount = Math.min(2, Math.round(2 * scale * 1.5));
  const unlockableTok = Math.round(820 * scale);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          ['Active referenda',  '12',                                               'across 2 chains'],
          ['Your votes',        isNone ? '—' : `${yourVotesCount} · ${yourVotesTok} DOT`, 'conviction locked'],
          ['Delegations',       isNone ? '—' : String(delegationsCount),            'active'],
          ['Unlockable',        isNone ? '—' : `${unlockableTok.toLocaleString('en-US')} DOT`, 'tracks ready'],
        ].map(([k, v, sub]) => (
          <NSPlate key={k} padding="14px 16px">
            <div style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>{k}</div>
            <div style={{ font: '700 18px Manrope', letterSpacing: '-0.02em', marginTop: 4 }}>{v}</div>
            <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginTop: 2 }}>{sub}</div>
          </NSPlate>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ font: '600 13px Inter', flex: 1 }}>Referenda</div>
            {[['all', 'All'], ['Polkadot', 'Polkadot'], ['Kusama', 'Kusama']].map(([id, label]) => (
              <button key={id} onClick={() => setChain(id)} style={{
                font: '600 11px Inter', padding: '5px 10px', border: 0, borderRadius: 8, cursor: 'pointer',
                background: chain === id ? '#fff' : 'transparent',
                boxShadow: chain === id ? 'var(--card-shadow)' : 'none',
                color: chain === id ? '#363643' : '#79797D',
              }}>{label}</button>
            ))}
          </div>
          {REFS.filter(r => chain === 'all' || r.chain === chain).map(r => (
            <NSPlate key={r.id} padding="14px 16px" hover>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ font: '500 11px JetBrains Mono, monospace', color: '#79797D' }}>#{r.id}</span>
                <span style={{
                  font: '600 10px Inter', letterSpacing: '0.5px', textTransform: 'uppercase',
                  padding: '2px 7px', borderRadius: 4,
                  background: TRACK_COLOR[r.track] + '22', color: TRACK_COLOR[r.track],
                }}>{r.track}</span>
                <ChainIcon chain={r.chain} size={14} />
                <span style={{ flex: 1 }} />
                <NSBadge tone={r.status === 'Approved' ? 'green' : r.status === 'Confirming' ? 'indigo' : 'orange'}>{r.status}</NSBadge>
                {r.my && !isNone && <NSBadge tone={r.my === 'Aye' ? 'green' : 'red'}>Voted {r.my}</NSBadge>}
              </div>
              <div style={{ font: '600 14px Inter', marginBottom: 10 }}>{r.title}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: 14, alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', font: '500 11px Inter', marginBottom: 4 }}>
                    <span style={{ color: '#01A63E', flex: 1 }}>Aye {r.aye}%</span>
                    <span style={{ color: '#F52163' }}>Nay {r.nay}%</span>
                  </div>
                  <VoteBar aye={r.aye} nay={r.nay} />
                </div>
                <div>
                  <div style={{ font: '500 10px Inter', color: '#79797D' }}>Turnout</div>
                  <div style={{ font: '600 12px Inter', marginTop: 2 }}>{r.turnout}%</div>
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <NSButton variant="secondary" size="sm">Details</NSButton>
                  {!r.my && r.status !== 'Approved' && <NSButton variant="primary" size="sm">Vote</NSButton>}
                </div>
              </div>
            </NSPlate>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <NSPlate padding="14px 16px">
            <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginBottom: 10 }}>Unlock Schedule</div>
            {[
              { amt: '560 DOT',  at: 'Ready',    color: '#01A63E', ready: true },
              { amt: '260 DOT',  at: 'In 3d',    color: '#4649F6' },
              { amt: '1,200 DOT', at: 'In 12d',  color: '#4649F6' },
              { amt: '0.6 KSM',  at: 'In 1d',    color: '#4649F6' },
            ].map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderTop: i === 0 ? 'none' : '0.5px solid rgba(69,69,137,0.06)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: u.color, marginRight: 8 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ font: '600 12px Inter' }}>{u.amt}</div>
                  <div style={{ font: '500 11px Inter', color: '#79797D' }}>{u.at}</div>
                </div>
                {u.ready && <NSButton variant="primary" size="sm">Unlock</NSButton>}
              </div>
            ))}
          </NSPlate>

          <NSPlate padding="14px 16px">
            <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginBottom: 10 }}>Your Delegations</div>
            {[
              { to: 'Web3 Foundation', addr: '14i0y…oJEaM', tracks: 6, amount: '2,400 DOT' },
              { to: 'Polkassembly',    addr: '12HWs…Kk6',   tracks: 2, amount: '180 DOT'   },
            ].map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderTop: i === 0 ? 'none' : '0.5px solid rgba(69,69,137,0.06)' }}>
                <Identicon seed={d.addr} size={24} />
                <div style={{ flex: 1, marginLeft: 10 }}>
                  <div style={{ font: '600 12px Inter' }}>{d.to}</div>
                  <div style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>{d.tracks} tracks · {d.amount}</div>
                </div>
                <NSIcon src="../../assets/icons/chevron/right.svg" size={10} style={{ opacity: 0.5 }} />
              </div>
            ))}
          </NSPlate>
        </div>
      </div>
    </div>
  );
};

// ============================ MAIN ============================

const DashboardPage = () => {
  const [tab, setTab] = React.useState(() => localStorage.getItem('spektr-dash-tab') || 'Overview');
  React.useEffect(() => localStorage.setItem('spektr-dash-tab', tab), [tab]);
  return (
    <WalletFilterProvider>
      <Header title="Dashboard" search={false} filter={false} right={<DashHeaderControls />} />
      <div style={{
        flex: 1, overflow: 'auto',
        paddingLeft: 'clamp(16px, 4vw, 64px)',
        paddingRight: 'clamp(16px, 4vw, 64px)',
        paddingBottom: 24,
      }}>
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <DashTabs tab={tab} setTab={setTab} />
          {tab === 'Overview'   && <OverviewView />}
          {tab === 'Staking'    && <StakingView />}
          {tab === 'Governance' && <GovernanceView />}
        </div>
      </div>
    </WalletFilterProvider>
  );
};

window.DashboardPage = DashboardPage;
