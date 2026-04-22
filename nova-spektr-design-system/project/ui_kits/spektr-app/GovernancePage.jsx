// Nova Spektr — Governance page

const REFERENDA = [
  { id: 1871, track: 'Treasury: Any',          status: 'DECIDING', timer: 'Reject in 16 hours',      title: 'Closeout of Polkadot Fast Grants & Open Source Developer Grants Bounty', outcome: 'aye' },
  { id: 1875, track: 'Treasury: Small spend',  status: 'DECIDING', timer: 'Reject in 3 days 15 hours', title: 'LunoKit — Unified Account Connection Infrastructure for Polkadot SDK + EVM Chains', outcome: 'nay' },
  { id: 1878, track: 'Treasury: Medium spend', status: 'DECIDING', timer: 'Reject in 6 days 18 hours', title: 'Please reject this referendum and vote on 1885 instead', outcome: 'nay', flag: 'warning' },
  { id: 1879, track: 'Treasury: Small spend',  status: 'DECIDING', timer: 'Reject in 7 days 8 hours', title: 'DeServe.network Global Polkadot Archive RPC Deployment - Proposal #1', outcome: 'nay' },
  { id: 1880, track: 'Treasury: Small spend',  status: 'DECIDING', timer: 'Reject in 7 days 8 hours', title: 'DeServe.network Global Paseo Archive RPC Deployment - Proposal #1', outcome: 'nay' },
  { id: 1885, track: 'Treasury: Medium spend', status: 'DECIDING', timer: 'Reject in 8 days 4 hours', title: 'Paseo Testnet Operations H1 2026 — USDC Funding via Multi-Asset', outcome: 'aye' },
];

const VoteBar = ({ outcome }) => {
  const aye = outcome === 'aye' ? 72 : 12;
  const nay = 100 - aye;
  return (
    <div style={{ display: 'flex', gap: 2, width: 120, height: 4, borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ flex: aye, background: '#01A63E' }} />
      <div style={{ flex: nay, background: '#F52163' }} />
    </div>
  );
};

const NetworkCard = () => (
  <NSPlate padding="8px 12px" style={{ flex: 1 }}>
    <div style={{ font: '500 10px Inter, system-ui', color: '#79797D', letterSpacing: '0.25px' }}>Network</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <span style={{
        width: 20, height: 20, borderRadius: 4, background: '#E6007A', color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        font: '800 11px Manrope', flexShrink: 0,
      }}>P</span>
      <span style={{ font: '600 13px Inter, system-ui', color: '#363643', flex: 1 }}>Polkadot Asset Hub</span>
      <NSIcon src="../../assets/icons/chevron/down.svg" size={12} style={{ opacity: 0.5 }} />
    </div>
  </NSPlate>
);

const MetaCard = ({ label, value, sub, actionOnly }) => (
  <NSPlate padding="8px 12px" style={{ flex: 1 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <NSIcon src="../../assets/icons/func/lock.svg" size={11} style={{ opacity: 0.45 }} />
      <span style={{ font: '500 10px Inter, system-ui', color: '#79797D' }}>{label}</span>
    </div>
    {actionOnly ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
        <span style={{ font: '600 13px Inter, system-ui', color: '#363643', flex: 1 }}>{value}</span>
        <NSIcon src="../../assets/icons/chevron/right.svg" size={12} style={{ opacity: 0.5 }} />
      </div>
    ) : (
      <>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <span style={{ font: '700 15px Manrope', letterSpacing: '-0.01em', color: '#363643' }}>{value}</span>
          <NSIcon src="../../assets/icons/chevron/right.svg" size={12} style={{ opacity: 0.5, marginLeft: 'auto' }} />
        </div>
        <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginTop: 2 }}>{sub}</div>
      </>
    )}
  </NSPlate>
);

const TrackDropdown = ({ label }) => (
  <button style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px',
    background: '#fff', border: 0, borderRadius: 8, boxShadow: 'var(--card-shadow)',
    font: '500 12px Inter, system-ui', color: '#363643', cursor: 'pointer',
  }}>
    {label}
    <NSIcon src="../../assets/icons/chevron/down.svg" size={11} style={{ opacity: 0.5 }} />
  </button>
);

const ReferendumRow = ({ r }) => (
  <NSPlate padding="14px 16px" hover>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <NSBadge tone="gray">{r.status}</NSBadge>
          <span style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>{r.timer}</span>
        </div>
        <div style={{ font: '500 13px Inter, system-ui', color: '#363643', letterSpacing: '-0.01em', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          {r.flag === 'warning' && (
            <span style={{
              display: 'inline-block', width: 13, height: 13, flexShrink: 0, marginTop: 4,
              background: '#F68F07',
              WebkitMask: 'url(../../assets/icons/func/warning.svg) center/contain no-repeat',
              mask: 'url(../../assets/icons/func/warning.svg) center/contain no-repeat',
            }} />
          )}
          <span>{r.title}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#A4A4AD' }}>#{r.id}</span>
          <NSIcon src="../../assets/icons/aes/treasury.svg" size={12} style={{ opacity: 0.6 }} />
          {r.track}
          <NSIcon src="../../assets/icons/func/copy.svg" size={11} style={{ opacity: 0.5, marginLeft: 4 }} />
        </div>
        <VoteBar outcome={r.outcome} />
      </div>
    </div>
  </NSPlate>
);

const GovernancePage = () => (
  <>
    <Header title="Governance" />
    <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
      <div style={{ maxWidth: 736, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <NetworkCard />
          <MetaCard label="Locked amount" value="0 DOT" sub="$0" />
          <MetaCard label="Delegated voting power" value="Add delegation" actionOnly />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <TrackDropdown label="Tracks" />
          <TrackDropdown label="Vote" />
        </div>
        <div>
          <div style={{
            font: '600 10px Inter, system-ui', letterSpacing: '0.75px',
            textTransform: 'uppercase', color: '#868692',
            display: 'flex', alignItems: 'center', gap: 6, padding: '4px 4px 8px',
          }}>
            Ongoing <span style={{ color: '#A4A4AD' }}>9</span>
            <NSIcon src="../../assets/icons/chevron/up.svg" size={10} style={{ opacity: 0.4, marginLeft: 'auto' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {REFERENDA.map(r => <ReferendumRow key={r.id} r={r} />)}
          </div>
        </div>
      </div>
    </div>
  </>
);

window.GovernancePage = GovernancePage;
