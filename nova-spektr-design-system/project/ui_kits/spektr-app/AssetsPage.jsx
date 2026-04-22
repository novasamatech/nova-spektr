// Nova Spektr — Portfolio / Assets page

const ASSETS = [
  { sym: 'DOT',   price: 1.29,     delta:  2.46, balance: 903.01,   usd: 1164.88, chains: ['DOT','KSM','ASTR','BNC','HDX','ACA','GLMR','USDT','USDC','KSM','DOT','DOT'], extra: 12 },
  { sym: 'ASTR',  price: 0.00824,  delta: -0.20, balance: 5069.13,  usd: 41.79,   chains: ['ASTR','DOT','KSM','BNC'], extra: 3 },
  { sym: 'USDT',  price: 1.00,     delta:  0.01, balance: 22.74,    usd: 22.74,   chains: ['USDT','DOT','KSM','ASTR','HDX'], extra: 11 },
  { sym: 'BNC',   price: 0.0324,   delta: -0.08, balance: 409.4,    usd: 13.26,   chains: ['BNC','DOT','ACA','HDX','ASTR'], extra: 5 },
  { sym: 'KSM',   price: 4.79,     delta:  1.54, balance: 2.48134,  usd: 11.88,   chains: ['KSM','DOT','ASTR','BNC'], extra: 10 },
  { sym: 'vDOT',  price: 2.09,     delta:  3.97, balance: 0.48132,  usd: 1.005,   chains: ['vDOT','DOT','KSM'], extra: 2 },
  { sym: 'HDX',   price: 0.00308,  delta: -1.34, balance: 204.2,    usd: 0.629,   chains: ['HDX','DOT'], extra: 0 },
  { sym: 'MYTH',  price: 0.00243,  delta:  8.27, balance: 146.73,   usd: 0.357,   chains: ['MYTH','DOT'], extra: 0 },
  { sym: 'USDC',  price: 0.99983,  delta:  0.00, balance: 0.31084,  usd: 0.31,    chains: ['USDC','DOT','ASTR'], extra: 2 },
  { sym: 'AAVE',  price: 92.88,    delta:  3.08, balance: 0.01201,  usd: 1.115,   chains: ['AAVE','DOT'], extra: 0 },
  { sym: 'kBTC',  price: 76672,    delta:  1.94, balance: 0.00003,  usd: 2.301,   chains: ['kBTC','DOT'], extra: 0 },
];

const fmtUsd = (n) => n == null ? '—' : n < 0.01 ? `$${n.toFixed(6)}` : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDelta = (d) => (d === 0 || d == null) ? '—' : `${d > 0 ? '+' : ''}${d.toFixed(2)}%`;

const AssetRow = ({ a, expanded, onToggle, onSend, onReceive }) => {
  const [h, setH] = React.useState(false);
  return (
    <>
      <div
        onClick={onToggle}
        onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{
          display: 'grid', gridTemplateColumns: '18px 1fr 140px 140px 80px',
          alignItems: 'center', gap: 16, cursor: 'pointer',
          padding: '10px 16px', borderRadius: expanded ? '12px 12px 0 0' : 12,
          background: h || expanded ? '#FAFAFC' : '#fff',
          boxShadow: 'var(--card-shadow)',
          transition: 'background .12s',
        }}>
        <span style={{ display: 'flex' }}>
          <NSIcon src="../../assets/icons/chevron/right.svg" size={12}
            style={{ opacity: 0.55, transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }} />
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <TokenIcon symbol={a.sym} size={28} />
          <div style={{ minWidth: 0 }}>
            <div style={{ font: '600 13px Inter, system-ui', color: '#363643' }}>{a.sym}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <ChainList chains={a.chains.slice(0, 4)} />
              {a.extra > 0 && (
                <span style={{
                  font: '600 10px Inter, system-ui', color: '#79797D',
                  padding: '1px 5px', background: '#F0F0F3', borderRadius: 4,
                }}>+{a.extra}</span>
              )}
              <span style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>
                {a.chains.length + a.extra} networks
              </span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ font: '500 13px Inter, system-ui', color: '#363643' }}>{fmtUsd(a.price)}</div>
          <div style={{
            font: '500 11px Inter, system-ui', marginTop: 2,
            color: a.delta > 0 ? '#01A63E' : a.delta < 0 ? '#F52163' : '#A4A4AD',
          }}>{fmtDelta(a.delta)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ font: '600 13px Inter, system-ui', color: '#363643' }}>
            {a.balance.toLocaleString('en-US', { maximumFractionDigits: 5 })}
          </div>
          <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginTop: 2 }}>
            {fmtUsd(a.usd)}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }} onClick={e => e.stopPropagation()}>
          <IconBtn src="../../assets/icons/arrows/send-arrow.svg" title="Send" onClick={() => onSend(a)} />
          <IconBtn src="../../assets/icons/arrows/receive-arrow.svg" title="Receive" onClick={() => onReceive(a)} />
        </div>
      </div>
      {expanded && <TokenExpanded asset={a} onSend={() => onSend(a)} onReceive={() => onReceive(a)} />}
    </>
  );
};

const AssetsPage = () => {
  const [expanded, setExpanded] = React.useState(null);
  const [send, setSend] = React.useState(null);
  const [receive, setReceive] = React.useState(null);
  return (
    <>
      <Header title="Portfolio" />
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '18px 1fr 140px 140px 80px',
            gap: 16, padding: '8px 16px',
            font: '600 10px Inter, system-ui', letterSpacing: '0.75px',
            textTransform: 'uppercase', color: '#868692',
          }}>
            <span />
            <span>Token</span>
            <span style={{ textAlign: 'right' }}>Price</span>
            <span style={{ textAlign: 'right' }}>Balance</span>
            <span />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ASSETS.map(a => (
              <AssetRow key={a.sym} a={a}
                expanded={expanded === a.sym}
                onToggle={() => setExpanded(e => e === a.sym ? null : a.sym)}
                onSend={setSend}
                onReceive={setReceive} />
            ))}
          </div>
        </div>
      </div>
      {send && <TransferFlow asset={send} onClose={() => setSend(null)} />}
      {receive && <ReceiveFlow asset={receive} onClose={() => setReceive(null)} />}
    </>
  );
};

window.AssetsPage = AssetsPage;
