// Nova Spektr — Fellowship, Address Book, Multisig, Notifications, Settings

// ========== Fellowship ==========
const FellowshipPage = () => (
  <>
    <Header title="Fellowship" right={
      <button style={{
        font: '500 12px Inter, system-ui', padding: '5px 10px', background: '#fff',
        border: 0, borderRadius: 8, boxShadow: 'var(--card-shadow)', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        Polkadot Collectives
        <NSIcon src="../../assets/icons/chevron/down.svg" size={11} style={{ opacity: 0.5 }} />
      </button>
    } search={false} />
    <div style={{ flex: 1, overflow: 'auto', paddingLeft: 'clamp(16px, 4vw, 64px)', paddingRight: 'clamp(16px, 4vw, 64px)', paddingBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, maxWidth: 1100, margin: '0 auto' }}>
        <NSPlate padding="0" style={{ minHeight: 540, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <img src="../../assets/document.svg" style={{ width: 60, opacity: 0.55 }} onError={e => e.target.style.display = 'none'} />
          <div style={{ font: 'var(--type-medium-title)', letterSpacing: '-0.016em', color: '#363643' }}>Task list is empty</div>
          <div style={{ font: 'var(--type-footnote)', color: '#79797D', textAlign: 'center', maxWidth: 280 }}>
            Account not found. Please add or create an account on the Polkadot Collectives network.
          </div>
        </NSPlate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <NSPlate padding="10px 14px" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Identicon seed="fellow" size={20} />
            <span style={{ font: '500 12px Inter, system-ui', color: '#363643', flex: 1 }}>Account not found</span>
            <NSIcon src="../../assets/icons/func/refresh.svg" size={12} style={{ opacity: 0.5 }} />
          </NSPlate>
          <NSPlate padding="12px 14px">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ font: '600 13px Inter, system-ui', color: '#363643', flex: 1 }}>Latest events</div>
              <a style={{ font: '600 12px Inter, system-ui', color: '#4649F6', cursor: 'pointer' }}>View list</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {[0.7, 0.8, 0.75, 0.65, 0.9, 0.8].map((w, i) => (
                <div key={i} style={{ height: 10, width: `${w*100}%`, background: 'rgba(69,69,137,0.06)', borderRadius: 999 }} />
              ))}
            </div>
          </NSPlate>
        </div>
      </div>
    </div>
  </>
);

// ========== Address Book ==========
const CONTACTS = [
  { name: 'multisig',   addr: '12HWs4C9gY6HZ3SuEVYbJU6ExUJc3SBsdwC7RRS3a7hJtpuaKk6', seed: 'multi' },
  { name: 'signatory_2', addr: '1GpGhC3BEewkz3ooQbsrgU3BufsEM5a8zUAwGaVwYK1B4jgEjsq', seed: 'sig2' },
  { name: 'signatory_3', addr: '1DtjvdKjKg3NXE8wftw3Hrj5V3sPRvtxbDpRxEBDnMWAGcseYpg2V', seed: 'sig3' },
  { name: 'signatory_4', addr: '1XtKsmZCfE0zjV1FAZbBpvAd1yt1gB4AEtyEvJcsvet9mRsdCCwyGj', seed: 'sig4' },
  { name: 'signatory_5', addr: '1BxaThksSdVeWbEcCrPFjLnTmwwEM2KCrb81bnufhR2pzosA3kvZ3', seed: 'sig5' },
];
const AddressBookPage = () => {
  const [tab, setTab] = React.useState('mine');
  return (
    <>
      <Header title="Address Book" right={
        <>
          <span style={{ font: '500 11px Inter, system-ui', color: '#79797D', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Synced 18h ago
            <NSIcon src="../../assets/icons/func/refresh.svg" size={10} style={{ opacity: 0.5 }} />
          </span>
          <NSBadge tone="orange" style={{ textTransform: 'none', letterSpacing: 0, font: '500 11px Inter' }}>
            External source · Session expired
          </NSBadge>
          <NSButton variant="primary" icon="../../assets/icons/func/add-circle.svg">Add contact</NSButton>
          <NSButton variant="primary">Import</NSButton>
        </>
      } />
      <div style={{ flex: 1, overflow: 'auto', paddingLeft: 'clamp(16px, 4vw, 64px)', paddingRight: 'clamp(16px, 4vw, 64px)', paddingBottom: 24 }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(69,69,137,0.06)', padding: 2, borderRadius: 8, marginBottom: 16 }}>
            {[['mine', 'My Contacts', CONTACTS.length], ['ext', 'External source', 0]].map(([id, label, count]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, font: '600 12px Inter', padding: '6px 16px', border: 0, borderRadius: 6, cursor: 'pointer',
                background: tab === id ? '#fff' : 'transparent',
                boxShadow: tab === id ? 'var(--card-shadow)' : 'none', color: '#363643',
              }}>{label} {count}</button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {CONTACTS.map(c => (
              <div key={c.addr} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                background: '#fff', borderRadius: 12, boxShadow: 'var(--card-shadow)',
              }}>
                <Identicon seed={c.seed} size={24} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 13px Inter', color: '#363643' }}>{c.name}</div>
                  <div style={{ font: '500 11px Inter', color: '#A4A4AD', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.addr}</div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <IconBtn src="../../assets/icons/arrows/send-arrow.svg" iconSize={12} />
                  <IconBtn src="../../assets/icons/func/copy.svg" iconSize={12} />
                  <IconBtn src="../../assets/icons/func/edit-pencil.svg" iconSize={12} />
                  <IconBtn src="../../assets/icons/func/delete.svg" iconSize={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

// ========== Multisig Operations ==========
const MULTISIG_OPS = [
  { date: '17 Apr 2026', title: 'Utility: Batch all',                       amount: null,       chain: 'Polkadot Asset Hub', who: 'Financial Multisig',  whoAddr: '1MFTXK…JX9sN', signed: '1 OF 2', action: 'approve' },
  { date: '1 Mar 2026',  title: 'Transfer',                                  amount: '0.01 DOT', amountUsd: '$0.0129', chain: 'Polkadot Asset Hub', who: 'Financial Pure Proxy', whoAddr: '13oUt…XMKQ',  signed: '1 OF 2', action: 'reject' },
  { date: '25 Jan 2026', title: 'Transfer',                                  amount: '0.0001 KSM', amountUsd: '$0.00047', chain: 'Kusama Asset Hub',  who: 'GWzSy…r2bf4',           whoAddr: 'GWzSy…r2bf4',   signed: '1 OF 2', action: 'reject', tokenSym: 'KSM' },
  { date: '24 Jan 2026', title: 'Transfer All',                              amount: null,       chain: 'Kusama Asset Hub',  who: '1SnXK…x2UDM',          whoAddr: '1SnXK…x2UDM',   signed: '1 OF 2', action: 'approve' },
  { date: '21 Jan 2026', title: 'Polkadot xcm: Limited teleport assets',    amount: null,       chain: 'Polkadot Asset Hub', who: '14i0y…oJEaM',          whoAddr: '14i0y…oJEaM',   signed: '1 OF 2', action: 'reject' },
  { date: '21 Jan 2026', title: 'Polkadot xcm: Transfer assets using type and then', amount: null, chain: 'Polkadot Asset Hub', who: '14i0y…oJEaM',          whoAddr: '14i0y…oJEaM',   signed: '1 OF 2', action: 'reject' },
];
const MultisigPage = () => {
  const [tab, setTab] = React.useState('pending');
  return (
    <>
      <Header title="Multisig Operations" />
      <div style={{ flex: 1, overflow: 'auto', paddingLeft: 'clamp(16px, 4vw, 64px)', paddingRight: 'clamp(16px, 4vw, 64px)', paddingBottom: 24 }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'inline-flex', gap: 4, background: 'rgba(69,69,137,0.06)', padding: 2, borderRadius: 8 }}>
              {[['pending', 'Pending 74'], ['history', 'History']].map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} style={{
                  font: '600 12px Inter', padding: '5px 16px', border: 0, borderRadius: 6, cursor: 'pointer',
                  background: tab === id ? '#fff' : 'transparent',
                  boxShadow: tab === id ? 'var(--card-shadow)' : 'none', color: '#363643',
                }}>{label}</button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            {['Date range', 'Accounts', 'Proxy type', 'Networks', 'Operation type'].map(f => (
              <button key={f} style={{
                font: '500 11px Inter', padding: '5px 10px', background: '#fff', border: 0, borderRadius: 8,
                boxShadow: 'var(--card-shadow)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, color: '#79797D',
              }}>{f}<NSIcon src="../../assets/icons/chevron/down.svg" size={10} style={{ opacity: 0.5 }} /></button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {MULTISIG_OPS.map((op, i) => (
              <React.Fragment key={i}>
                {(i === 0 || MULTISIG_OPS[i-1].date !== op.date) && (
                  <div style={{ font: '500 11px Inter', color: '#79797D', padding: '14px 4px 6px' }}>{op.date}</div>
                )}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 160px 1fr 100px 90px 60px',
                  alignItems: 'center', gap: 16, padding: '10px 14px',
                  background: '#fff', borderRadius: 12, boxShadow: 'var(--card-shadow)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%', background: '#FEEDDD',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F68F07' }} />
                    </span>
                    <div>
                      <div style={{ font: '600 13px Inter' }}>{op.title}</div>
                      <div style={{ font: '500 11px Inter', color: '#79797D', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: '#E6007A' }} />
                        {op.chain}
                      </div>
                    </div>
                  </div>
                  <div>
                    {op.amount && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <TokenIcon symbol={op.tokenSym || 'DOT'} size={18} />
                          <span style={{ font: '600 13px Inter' }}>{op.amount}</span>
                        </div>
                        <div style={{ font: '500 11px Inter', color: '#79797D', marginTop: 2 }}>{op.amountUsd}</div>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Identicon seed={op.whoAddr} size={20} />
                    <div>
                      <div style={{ font: '600 12px Inter' }}>{op.who}</div>
                      <div style={{ font: '500 11px Inter', color: '#A4A4AD' }}>{op.whoAddr}</div>
                    </div>
                  </div>
                  <div style={{ font: '500 11px Inter', color: '#79797D', letterSpacing: '0.5px' }}>{op.signed} SIGNED</div>
                  <div>
                    {op.action === 'approve'
                      ? <NSButton variant="primary" size="sm">Approve</NSButton>
                      : <NSButton variant="danger" size="sm">Reject</NSButton>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <NSIcon src="../../assets/icons/chevron/down.svg" size={12} style={{ opacity: 0.5 }} />
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

// ========== Notifications ==========
const NOTIFS = [
  { date: '21 Apr 2026', title: 'Add delegated authority (proxy)', state: 'rejected', who: '13Zuh…iMR2j', chain: 'Polkadot Asset Hub', time: '14:47' },
  { date: '21 Apr 2026', title: 'Transfer 1 DOT', state: 'rejected', who: '15M78…Nbr1Jv', chain: 'Polkadot Asset Hub', time: '14:47' },
  { date: '21 Apr 2026', title: 'Transfer 1 DOT', state: 'rejected', who: '15M78…Nbr1Jv', chain: 'Polkadot Asset Hub', time: '14:47' },
  { date: '21 Apr 2026', title: 'Transfer 1 DOT', state: 'rejected', who: '15M78…Nbr1Jv', chain: 'Polkadot Asset Hub', time: '14:47' },
  { date: '21 Apr 2026', title: 'Utility: Force batch', state: 'executed', who: 'Novasama', chain: 'Polkadot Relay', time: '14:47' },
  { date: '21 Apr 2026', title: 'Utility: Force batch', state: 'executed', who: 'Novasama', chain: 'Polkadot Relay', time: '14:47' },
];
const NotificationsPage = () => (
  <>
    <Header title="Notifications" right={
      <button style={{
        font: '500 11px Inter', padding: '5px 10px', background: '#fff', border: 0, borderRadius: 8,
        boxShadow: 'var(--card-shadow)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, color: '#79797D',
      }}>Filter by date<NSIcon src="../../assets/icons/chevron/down.svg" size={10} style={{ opacity: 0.5 }} /></button>
    } />
    <div style={{ flex: 1, overflow: 'auto', paddingLeft: 'clamp(16px, 4vw, 64px)', paddingRight: 'clamp(16px, 4vw, 64px)', paddingBottom: 24 }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{
          font: '600 10px Inter', letterSpacing: '0.75px', textTransform: 'uppercase',
          color: '#868692', padding: '8px 4px',
        }}>21 Apr 2026</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NOTIFS.map((n, i) => (
            <div key={i} style={{
              padding: '12px 14px', background: '#fff', borderRadius: 12, boxShadow: 'var(--card-shadow)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: n.state === 'executed' ? '#DAF1E1' : '#FEDDE6',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: n.state === 'executed' ? '#01A63E' : '#F52163' }} />
                </span>
                <span style={{ font: '600 13px Inter', flex: 1 }}>
                  {n.title} <span style={{ color: n.state === 'executed' ? '#01A63E' : '#F52163', fontWeight: 500 }}>{n.state}</span>
                </span>
                <span style={{ font: '500 11px Inter', color: '#A4A4AD' }}>{n.time}</span>
              </div>
              <div style={{ font: '500 12px Inter', color: '#79797D', display: 'flex', alignItems: 'center', gap: 4, margin: '6px 0 8px', paddingLeft: 26 }}>
                <span>in</span>
                <Identicon seed={n.who} size={12} />
                <span>{n.who}</span>
                <span>on</span>
                <span style={{ width: 10, height: 10, display: 'inline-block', borderRadius: 2, background: '#E6007A' }} />
                <span>{n.chain}</span>
              </div>
              <button style={{
                font: '600 12px Inter', color: '#4649F6', background: 'transparent', border: 0,
                padding: '0 0 0 26px', cursor: 'pointer',
              }}>View Operation</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);

// ========== Settings ==========
const SettingsPage = () => {
  const rows = [
    { icon: '../../assets/icons/func/network.svg', title: 'Network', sub: 'Manage network connection' },
    { icon: '../../assets/icons/aes/info.svg',      title: 'Referendum data', right: 'Subsquare' },
    { icon: '../../assets/icons/func/details.svg',  title: 'Currency', right: 'USD' },
    { icon: '../../assets/icons/func/eye-slashed.svg', title: 'Hidden wallets' },
    { icon: '../../assets/icons/nav/notifications.svg', title: 'Notifications' },
  ];
  const social = [
    { label: 'T',  title: 'Twitter',  sub: 'Stay connected with us and never miss out on the latest updates and news' },
    { label: 'G',  title: 'GitHub',   sub: 'Contribute and explore our open-source project on GitHub for collaboration and code sharing' },
    { label: 'Y',  title: 'YouTube',  sub: 'Discover our demo recordings and valuable learning materials on YouTube' },
    { label: 'M',  title: 'Medium',   sub: 'Engaging content to expand knowledge and stay informed about Nova Spektr' },
  ];
  return (
    <>
      <Header title="Settings" search={false} />
      <div style={{ flex: 1, overflow: 'auto', paddingLeft: 'clamp(16px, 4vw, 64px)', paddingRight: 'clamp(16px, 4vw, 64px)', paddingBottom: 24 }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Section title="General">
            {rows.map(r => (
              <SettingsRow key={r.title} {...r} />
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 16px', background: '#fff', borderRadius: 12, boxShadow: 'var(--card-shadow)' }}>
              <NSBadge tone="orange">DEV MODE</NSBadge>
              <NSButton variant="warning" style={{ width: '100%', justifyContent: 'center', borderRadius: 999 }}>Export database</NSButton>
              <NSButton variant="danger"  style={{ width: '100%', justifyContent: 'center', borderRadius: 999 }}>Erase all data</NSButton>
            </div>
          </Section>
          <Section title="External Address Book">
            <SettingsRow icon="../../assets/icons/aes/globe.svg" title="External Address Book" sub="Not connected" right={
              <a style={{ font: '600 12px Inter', color: '#4649F6', cursor: 'pointer' }}>Configure</a>
            } />
          </Section>
          <Section title="Social">
            {social.map(s => (
              <div key={s.title} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                background: '#fff', borderRadius: 12, boxShadow: 'var(--card-shadow)',
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%', background: 'rgba(69,69,137,0.06)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  font: '800 13px Manrope', color: '#4649F6',
                }}>{s.label}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 13px Inter' }}>{s.title}</div>
                  <div style={{ font: '500 11px Inter', color: '#79797D', marginTop: 2 }}>{s.sub}</div>
                </div>
                <NSIcon src="../../assets/icons/arrows/send-arrow.svg" size={12} style={{ opacity: 0.4 }} />
              </div>
            ))}
          </Section>
        </div>
      </div>
    </>
  );
};
const Section = ({ title, children }) => (
  <div>
    <div style={{ font: '600 10px Inter', letterSpacing: '0.75px', textTransform: 'uppercase', color: '#868692', padding: '4px 4px 10px' }}>{title}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
  </div>
);
const SettingsRow = ({ icon, title, sub, right }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#fff', borderRadius: 12, boxShadow: 'var(--card-shadow)' }}>
    <span style={{
      width: 28, height: 28, borderRadius: 8, background: 'rgba(69,69,137,0.06)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <NSIcon src={icon} size={14} style={{ opacity: 0.7 }} />
    </span>
    <div style={{ flex: 1 }}>
      <div style={{ font: '600 13px Inter' }}>{title}</div>
      {sub && <div style={{ font: '500 11px Inter', color: '#79797D', marginTop: 2 }}>{sub}</div>}
    </div>
    {typeof right === 'string'
      ? <span style={{ font: '500 12px Inter', color: '#79797D' }}>{right}</span>
      : right}
  </div>
);

Object.assign(window, { FellowshipPage, AddressBookPage, MultisigPage, NotificationsPage, SettingsPage });
