// Nova Spektr — Transfer (Send) + Receive flows + token expand detail

const NETWORKS_FOR = {
  DOT:   [{ chain: 'Polkadot',             bal: 125.0,    free: 112.4, lock: 12.6 },
          { chain: 'Polkadot Asset Hub',   bal: 702.01,   free: 702.01, lock: 0 },
          { chain: 'Astar',                bal: 76.0,     free: 76.0,  lock: 0 }],
  KSM:   [{ chain: 'Kusama',               bal: 2.3,      free: 2.3,   lock: 0 },
          { chain: 'Kusama Asset Hub',     bal: 0.18,     free: 0.18,  lock: 0 }],
  USDT:  [{ chain: 'Polkadot Asset Hub',   bal: 18.74,    free: 18.74, lock: 0 },
          { chain: 'Hydration',            bal: 4.0,      free: 4.0,   lock: 0 }],
  USDC:  [{ chain: 'Polkadot Asset Hub',   bal: 0.31,     free: 0.31,  lock: 0 }],
  ASTR:  [{ chain: 'Astar',                bal: 5069.13,  free: 5069.13, lock: 0 }],
  BNC:   [{ chain: 'Bifrost Polkadot',     bal: 409.4,    free: 409.4, lock: 0 }],
  MYTH:  [{ chain: 'Mythos',               bal: 146.73,   free: 146.73, lock: 0 }],
};

const RECENT_CONTACTS = [
  { name: 'multisig',    addr: '12HWs4C9gY6HZ3SuEVYbJU6ExUJc3SBsdwC7RRS3a7hJtpuaKk6', seed: 'multi' },
  { name: 'signatory_2', addr: '1GpGhC3BEewkz3ooQbsrgU3BufsEM5a8zUAwGaVwYK1B4jgEjsq', seed: 'sig2' },
  { name: 'signatory_3', addr: '1DtjvdKjKg3NXE8wftw3Hrj5V3sPRvtxbDpRxEBDnMWAGcseYpg2V', seed: 'sig3' },
  { name: 'Stash — Hot',  addr: '15oF4uVJwmVn3x1dsB4FQ3e5e2y9xY5nN8R7xQ6P5Yj1kH2Lm', seed: 'stash' },
];

// --- Shared pieces ------------------------------------------------------

const TokenHeader = ({ sym, balance, usd, chain }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', background: '#fff', borderRadius: 12,
    boxShadow: 'var(--card-shadow)', marginBottom: 14,
  }}>
    <TokenIcon symbol={sym} size={36} />
    <div style={{ flex: 1 }}>
      <div style={{ font: '700 15px Manrope', letterSpacing: '-0.01em' }}>{sym}</div>
      <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
        <ChainIcon chain={chain} size={12} />
        {chain}
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ font: '600 13px Inter, system-ui' }}>{balance.toLocaleString()} {sym}</div>
      <div style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>≈ ${usd.toLocaleString()}</div>
    </div>
  </div>
);

const NetworkPicker = ({ sym, value, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const list = NETWORKS_FOR[sym] || [];
  const cur = list.find(n => n.chain === value) || list[0];
  if (!cur) return null;
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', background: '#fff', border: 0, borderRadius: 10,
        boxShadow: 'var(--card-shadow)', cursor: 'pointer', textAlign: 'left',
      }}>
        <ChainIcon chain={cur.chain} size={20} />
        <div style={{ flex: 1 }}>
          <div style={{ font: '600 13px Inter, system-ui' }}>{cur.chain}</div>
          <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginTop: 1 }}>
            {cur.bal.toLocaleString()} {sym} available
          </div>
        </div>
        <NSIcon src="../../assets/icons/chevron/down.svg" size={10} style={{ opacity: 0.5 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 10,
          background: '#fff', borderRadius: 12, padding: 6,
          boxShadow: '0 16px 32px -8px rgba(24,24,45,0.2), var(--card-shadow)',
        }}>
          {list.map(n => (
            <button key={n.chain} onClick={() => { onChange(n.chain); setOpen(false); }} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', border: 0, borderRadius: 8, background: n.chain === cur.chain ? 'rgba(69,69,137,0.06)' : 'transparent',
              cursor: 'pointer', textAlign: 'left',
            }}>
              <ChainIcon chain={n.chain} size={18} />
              <div style={{ flex: 1 }}>
                <div style={{ font: '600 12px Inter' }}>{n.chain}</div>
                <div style={{ font: '500 11px Inter', color: '#79797D' }}>{n.bal.toLocaleString()} {sym}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Transfer Flow (Send) ----------------------------------------------

const TransferFlow = ({ asset, onClose }) => {
  const [step, setStep] = React.useState('init'); // init | confirm | signing | success
  const [chain, setChain] = React.useState(NETWORKS_FOR[asset.sym]?.[0]?.chain);
  const [recipient, setRecipient] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [showContacts, setShowContacts] = React.useState(false);

  const current = (NETWORKS_FOR[asset.sym] || []).find(n => n.chain === chain) || {};
  const feeDot = 0.0152;
  const feeUsd = feeDot * asset.price;
  const amt = parseFloat(amount) || 0;
  const valid = amt > 0 && amt <= (current.bal || 0) && recipient.length > 20;

  // ----- Init form -----
  if (step === 'init') {
    return (
      <NSModal open onClose={onClose} title={`Send ${asset.sym}`} subtitle="From valentun" width={440}
        footer={
          <NSButton variant="primary" disabled={!valid} onClick={() => setStep('confirm')}
            style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
            Continue
          </NSButton>
        }>
        <TokenHeader sym={asset.sym} balance={current.bal || 0} usd={(current.bal || 0) * asset.price} chain={chain} />

        <NSField label="Network">
          <NetworkPicker sym={asset.sym} value={chain} onChange={setChain} />
        </NSField>

        <NSField label="Recipient address"
          right={<button onClick={() => setShowContacts(s => !s)} style={{
            font: '600 11px Inter', color: '#4649F6', background: 'transparent', border: 0, cursor: 'pointer',
          }}>Contacts</button>}>
          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              background: '#fff', borderRadius: 10, boxShadow: 'var(--card-shadow)',
            }}>
              {recipient ? <Identicon seed={recipient} size={20} /> : <NSIcon src="../../assets/icons/func/search.svg" size={14} style={{ opacity: 0.4 }} />}
              <input value={recipient} onChange={e => setRecipient(e.target.value)}
                placeholder="Enter address or select from contacts"
                style={{ flex: 1, border: 0, outline: 0, font: '500 12px JetBrains Mono, monospace', background: 'transparent' }} />
              <IconBtn src="../../assets/icons/func/copy.svg" iconSize={12} />
            </div>
            {showContacts && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 10,
                background: '#fff', borderRadius: 12, padding: 6, maxHeight: 260, overflow: 'auto',
                boxShadow: '0 16px 32px -8px rgba(24,24,45,0.2), var(--card-shadow)',
              }}>
                {RECENT_CONTACTS.map(c => (
                  <button key={c.addr} onClick={() => { setRecipient(c.addr); setShowContacts(false); }} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    border: 0, borderRadius: 8, background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  }}>
                    <Identicon seed={c.seed} size={22} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: '600 12px Inter' }}>{c.name}</div>
                      <div style={{ font: '500 11px Inter', color: '#A4A4AD', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.addr}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </NSField>

        <NSField label="Amount"
          right={
            <span style={{ font: '500 11px Inter', color: '#79797D' }}>
              Available: <b style={{ color: '#363643' }}>{current.bal?.toLocaleString()} {asset.sym}</b>
            </span>
          }
          error={amt > (current.bal || 0) ? 'Not enough balance' : null}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            background: '#fff', borderRadius: 10, boxShadow: 'var(--card-shadow)',
          }}>
            <TokenIcon symbol={asset.sym} size={22} />
            <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="0.00" inputMode="decimal"
              style={{ flex: 1, border: 0, outline: 0, font: '700 18px Manrope', letterSpacing: '-0.01em', background: 'transparent' }} />
            <button onClick={() => setAmount(String(current.bal || 0))} style={{
              font: '600 11px Inter', color: '#4649F6', background: 'rgba(70,73,246,0.08)', border: 0,
              padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
            }}>Max</button>
          </div>
          <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginTop: 6, textAlign: 'right' }}>
            ≈ ${(amt * asset.price).toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </div>
        </NSField>

        <div style={{
          background: '#fff', borderRadius: 10, boxShadow: 'var(--card-shadow)', padding: '10px 14px',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {[
            ['Network fee',     `${feeDot.toFixed(4)} ${asset.sym}`, `$${feeUsd.toFixed(4)}`],
            ['Existential deposit', '1.0000 DOT', '$1.29'],
          ].map(([k, v, sub]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ font: '500 12px Inter', color: '#79797D', flex: 1 }}>{k}</span>
              <span style={{ font: '600 12px Inter', marginRight: 6 }}>{v}</span>
              <span style={{ font: '500 11px Inter', color: '#79797D' }}>{sub}</span>
            </div>
          ))}
        </div>
      </NSModal>
    );
  }

  // ----- Confirm step -----
  if (step === 'confirm') {
    const row = (label, val) => (
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderTop: '0.5px solid rgba(69,69,137,0.08)' }}>
        <span style={{ font: '500 12px Inter', color: '#79797D', flex: 1 }}>{label}</span>
        <span style={{ font: '600 12px Inter', color: '#363643', textAlign: 'right' }}>{val}</span>
      </div>
    );
    return (
      <NSModal open onClose={onClose} title="Confirm transfer" width={420}
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <NSButton variant="secondary" onClick={() => setStep('init')} style={{ flex: 1, justifyContent: 'center' }}>Back</NSButton>
            <NSButton variant="primary" onClick={() => { setStep('signing'); setTimeout(() => setStep('success'), 1400); }} style={{ flex: 2, justifyContent: 'center' }}>
              Sign and submit
            </NSButton>
          </div>
        }>
        <div style={{ textAlign: 'center', padding: '8px 0 18px' }}>
          <TokenIcon symbol={asset.sym} size={64} />
          <div style={{ font: '800 28px Manrope', letterSpacing: '-0.02em', marginTop: 10 }}>
            {amt.toLocaleString()} {asset.sym}
          </div>
          <div style={{ font: '500 13px Inter', color: '#79797D', marginTop: 4 }}>
            ≈ ${(amt * asset.price).toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: '4px 16px' }}>
          {row('Network', <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ChainIcon chain={chain} size={14} />{chain}</span>)}
          {row('From', <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Identicon seed="valentun-spektr" size={16} />valentun</span>)}
          {row('To', <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '500 12px JetBrains Mono, monospace' }}><Identicon seed={recipient} size={16} />{truncate(recipient, 6, 6)}</span>)}
          {row('Network fee', `${feeDot.toFixed(4)} ${asset.sym} · $${feeUsd.toFixed(4)}`)}
          {row('Arrival', 'In ~12 seconds')}
        </div>
      </NSModal>
    );
  }

  // ----- Signing / Success -----
  if (step === 'signing') {
    return (
      <NSModal open onClose={onClose} title="Signing with Polkadot Vault" width={380}>
        <div style={{ padding: '20px 0 30px', textAlign: 'center' }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', background: 'rgba(70,73,246,0.10)',
            margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div className="spinner" style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '3px solid rgba(70,73,246,0.2)', borderTopColor: '#4649F6',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
          <div style={{ font: 'var(--type-medium-title)', color: '#363643' }}>Waiting for signature…</div>
          <div style={{ font: 'var(--type-footnote)', color: '#79797D', marginTop: 6, maxWidth: 280, margin: '6px auto 0' }}>
            Scan the QR code shown on screen with your Polkadot Vault device to approve the extrinsic.
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </NSModal>
    );
  }

  // success
  return (
    <NSModal open onClose={onClose} title="Transfer submitted" width={400}
      footer={<NSButton variant="primary" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>Done</NSButton>}>
      <div style={{ textAlign: 'center', padding: '6px 0 16px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: '#DAF1E1',
          margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <NSIcon src="../../assets/icons/func/checkmark.svg" size={28} />
        </div>
        <div style={{ font: 'var(--type-title)', color: '#363643' }}>Extrinsic included in block</div>
        <div style={{ font: 'var(--type-footnote)', color: '#79797D', marginTop: 6 }}>
          Sent <b>{amt.toLocaleString()} {asset.sym}</b> on {chain}
        </div>
        <div style={{
          font: '500 11px JetBrains Mono, monospace', color: '#4649F6',
          marginTop: 14, padding: '8px 12px', background: '#fff', borderRadius: 8,
          boxShadow: 'var(--card-shadow)', display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          0x7f3a…e91c
          <NSIcon src="../../assets/icons/func/copy.svg" size={10} style={{ opacity: 0.5 }} />
        </div>
      </div>
    </NSModal>
  );
};

// --- Receive Flow -------------------------------------------------------

const ReceiveFlow = ({ asset, onClose }) => {
  const [chain, setChain] = React.useState(NETWORKS_FOR[asset.sym]?.[0]?.chain);
  const myAddress = '15M78H5JCdR6BmuR5CrFxfHkMiWJ12PejbLcqQVv3Nbr1Jv';

  return (
    <NSModal open onClose={onClose} title={`Receive ${asset.sym}`} subtitle="Share your address or QR" width={400}
      footer={
        <NSButton variant="primary" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>Done</NSButton>
      }>
      <TokenHeader sym={asset.sym} balance={(NETWORKS_FOR[asset.sym]?.find(n => n.chain === chain) || {}).bal || 0} usd={0} chain={chain} />

      <NSField label="Network">
        <NetworkPicker sym={asset.sym} value={chain} onChange={setChain} />
      </NSField>

      <div style={{
        background: '#fff', borderRadius: 16, boxShadow: 'var(--card-shadow)',
        padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}>
        <QRPlaceholder address={myAddress} size={200} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
          background: 'rgba(69,69,137,0.04)', borderRadius: 10, maxWidth: 320,
        }}>
          <Identicon seed="valentun-spektr" size={20} />
          <span style={{ font: '500 12px JetBrains Mono, monospace', color: '#363643', wordBreak: 'break-all' }}>
            {myAddress}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <NSButton variant="secondary" icon="../../assets/icons/func/copy.svg" style={{ flex: 1, justifyContent: 'center' }}>Copy address</NSButton>
          <NSButton variant="secondary" icon="../../assets/icons/func/export.svg" style={{ flex: 1, justifyContent: 'center' }}>Share QR</NSButton>
        </div>
      </div>

      <div style={{
        marginTop: 12, padding: '10px 14px', background: '#FEEDDD', borderRadius: 10,
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <span style={{
          width: 14, height: 14, background: '#8A5B10', flexShrink: 0, marginTop: 1,
          WebkitMask: 'url(../../assets/icons/aes/info.svg) center / contain no-repeat',
          mask: 'url(../../assets/icons/aes/info.svg) center / contain no-repeat',
        }} />
        <div style={{ font: '500 12px Inter', color: '#8A5B10', lineHeight: 1.45 }}>
          Only send <b>{asset.sym}</b> on the <b>{chain}</b> network to this address. Assets sent on other networks may be lost.
        </div>
      </div>
    </NSModal>
  );
};

// Pixel-art QR placeholder — deterministic from address
const QRPlaceholder = ({ address, size = 200 }) => {
  const cells = 25;
  const cell = size / cells;
  const grid = React.useMemo(() => {
    let h = 2166136261;
    for (const c of address) h = (h * 16777619) ^ c.charCodeAt(0);
    const g = [];
    for (let y = 0; y < cells; y++) {
      const row = [];
      for (let x = 0; x < cells; x++) {
        h = (h * 1103515245 + 12345) & 0x7fffffff;
        row.push((h & 7) < 4 ? 1 : 0);
      }
      g.push(row);
    }
    // Position markers (top-left, top-right, bottom-left)
    const stamp = (r, c) => {
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        const inBorder = y === 0 || y === 6 || x === 0 || x === 6;
        const inCenter = y >= 2 && y <= 4 && x >= 2 && x <= 4;
        g[r+y][c+x] = inBorder || inCenter ? 1 : 0;
      }
    };
    stamp(0, 0); stamp(0, cells-7); stamp(cells-7, 0);
    return g;
  }, [address]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="#fff" />
      {grid.map((row, y) => row.map((v, x) => v ? (
        <rect key={`${y}-${x}`} x={x*cell} y={y*cell} width={cell} height={cell} fill="#151524" />
      ) : null))}
    </svg>
  );
};

// --- Token expanded row — inline per-network list ---------------------

const TokenExpanded = ({ asset, onSend, onReceive }) => {
  const nets = NETWORKS_FOR[asset.sym] || [];
  if (nets.length === 0) return null;
  return (
    <div style={{
      background: '#fff', borderRadius: 12, boxShadow: 'var(--card-shadow)',
      padding: '4px 0', margin: '2px 0 4px',
    }}>
      {nets.map((n, i) => (
        <div key={n.chain} style={{
          display: 'grid', gridTemplateColumns: '18px 1fr 140px 140px 80px',
          alignItems: 'center', gap: 16, padding: '10px 16px',
          borderTop: i === 0 ? 'none' : '0.5px solid rgba(69,69,137,0.06)',
        }}>
          <span />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ChainIcon chain={n.chain} size={24} />
            <div>
              <div style={{ font: '600 13px Inter' }}>{n.chain}</div>
              <div style={{ font: '500 11px Inter', color: '#79797D' }}>
                Transferable: {n.free.toLocaleString()} · Locked: {n.lock.toLocaleString()}
              </div>
            </div>
          </div>
          <div />
          <div style={{ textAlign: 'right' }}>
            <div style={{ font: '600 13px Inter' }}>{n.bal.toLocaleString()} {asset.sym}</div>
            <div style={{ font: '500 11px Inter', color: '#79797D' }}>
              ≈ ${(n.bal * asset.price).toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <IconBtn src="../../assets/icons/arrows/send-arrow.svg" title="Send" onClick={() => onSend(n.chain)} />
            <IconBtn src="../../assets/icons/arrows/receive-arrow.svg" title="Receive" onClick={() => onReceive(n.chain)} />
          </div>
        </div>
      ))}
    </div>
  );
};

Object.assign(window, { TransferFlow, ReceiveFlow, TokenExpanded, NETWORKS_FOR });
