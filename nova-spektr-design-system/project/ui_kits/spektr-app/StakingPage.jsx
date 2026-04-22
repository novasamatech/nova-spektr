// Nova Spektr — Staking page

const STAKING_ACCOUNTS = [
  { name: 'valentun', addr: '12JaanTyAzypSR...vkrion6PqASwR6', staked: 0,    stakedUsd: 0,    rewards: 3.38545, rewardsUsd: 4.38724 },
];

const StakingAccountRow = ({ a }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: '1fr 120px 140px 32px',
    gap: 16, alignItems: 'center',
    padding: '10px 16px', background: '#fff', borderRadius: 12,
    boxShadow: 'var(--card-shadow)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <Identicon seed={a.name} size={24} />
      <div style={{ minWidth: 0 }}>
        <div style={{ font: '600 13px Inter, system-ui', color: '#363643' }}>{a.name}</div>
        <div style={{ font: '500 11px Inter, system-ui', color: '#A4A4AD', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {a.addr}
        </div>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ font: '600 13px Inter, system-ui', color: '#363643' }}>{a.staked} DOT</div>
      <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginTop: 2 }}>${a.stakedUsd}</div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ font: '600 13px Inter, system-ui', color: '#363643' }}>{a.rewards} DOT</div>
      <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginTop: 2 }}>${a.rewardsUsd}</div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <input type="checkbox" style={{ width: 16, height: 16, accentColor: '#4649F6' }} />
    </div>
  </div>
);

const StakingMetaCard = ({ label, value, sub, chevron }) => (
  <NSPlate padding="8px 12px" style={{ flex: 1 }}>
    <div style={{ font: '500 10px Inter, system-ui', color: '#79797D' }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
      <span style={{ font: '700 15px Manrope', letterSpacing: '-0.01em', color: '#363643', flex: 1 }}>{value}</span>
      {chevron && <NSIcon src="../../assets/icons/chevron/down.svg" size={12} style={{ opacity: 0.5 }} />}
    </div>
    {sub != null && <div style={{ font: '500 11px Inter, system-ui', color: '#79797D', marginTop: 2 }}>{sub}</div>}
  </NSPlate>
);

const StakingPage = () => (
  <>
    <Header title="Staking" />
    <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
      <div style={{ maxWidth: 736, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <NetworkCard />
          <StakingMetaCard label="Total staked" value="0 DOT" sub="$0" />
          <StakingMetaCard label="Total rewards" value="3.38545 DOT" sub="$4.38724" chevron />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <h3 style={{ font: 'var(--type-medium-title)', letterSpacing: '-0.016em', flex: 1 }}>Accounts</h3>
            <NSButton variant="primary" iconRight="../../assets/icons/chevron/down.svg">Select accounts</NSButton>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 120px 140px 32px',
            gap: 16, padding: '8px 16px',
            font: '600 10px Inter, system-ui', letterSpacing: '0.75px',
            textTransform: 'uppercase', color: '#868692',
          }}>
            <span>Accounts</span>
            <span style={{ textAlign: 'right' }}>Staked</span>
            <span style={{ textAlign: 'right' }}>Rewards</span>
            <span />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {STAKING_ACCOUNTS.map(a => <StakingAccountRow key={a.name} a={a} />)}
          </div>
        </div>
      </div>
    </div>
  </>
);

window.StakingPage = StakingPage;
