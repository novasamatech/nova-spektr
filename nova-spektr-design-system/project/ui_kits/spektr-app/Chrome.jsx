// Nova Spektr — app chrome: SideNav + Header

const NAV_ITEMS = [
  { id: 'assets',       label: 'Portfolio',     icon: '../../assets/icons/nav/assets.svg' },
  { id: 'staking',      label: 'Staking',       icon: '../../assets/icons/nav/staking.svg' },
  { id: 'governance',   label: 'Governance',    icon: '../../assets/icons/nav/governance.svg' },
  { id: 'fellowship',   label: 'Fellowship',    icon: '../../assets/icons/nav/fellowship.svg' },
  { id: 'addressbook',  label: 'Address Book',  icon: '../../assets/icons/nav/address-book.svg' },
  { id: 'operations',   label: 'Custom operation', icon: '../../assets/icons/func/magic.svg' },
];

const NAV_FOOTER = [
  { id: 'dashboard',     label: 'Dashboard',          icon: '../../assets/icons/nav/dashboard.svg' },
  { id: 'multisig',      label: 'Multisig Operations', icon: '../../assets/icons/nav/operations.svg' },
  { id: 'notifications', label: 'Notifications',      icon: '../../assets/icons/nav/notifications.svg', badge: 14 },
  { id: 'settings',      label: 'Settings',           icon: '../../assets/icons/nav/settings.svg' },
];

const WalletPicker = ({ collapsed }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', margin: collapsed ? '12px 8px' : '12px 14px', borderRadius: 12,
    background: '#fff', boxShadow: 'var(--card-shadow)', cursor: 'pointer',
    justifyContent: collapsed ? 'center' : 'flex-start',
  }}>
    <Identicon seed="valentun-spektr" size={32} />
    {!collapsed && <>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: '600 13px Inter, system-ui', color: '#363643', display: 'flex', alignItems: 'center', gap: 4 }}>
          valentun
          <NSIcon src="../../assets/icons/func/add-circle.svg" size={12} style={{ opacity: .7 }} />
        </div>
        <div style={{ font: '500 11px Inter, system-ui', color: '#79797D' }}>$1,260.62</div>
      </div>
      <NSIcon src="../../assets/icons/chevron/down.svg" size={12} style={{ opacity: .5 }} />
    </>}
  </div>
);

const NavRow = ({ item, active, onClick, collapsed }) => {
  const [h, setH] = React.useState(false);
  const isActive = active;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      title={collapsed ? item.label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: collapsed ? 'calc(100% - 16px)' : 'calc(100% - 28px)',
        margin: collapsed ? '0 8px' : '0 14px',
        padding: collapsed ? '7px 0' : '7px 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        border: 0, cursor: 'pointer', textAlign: 'left',
        background: isActive ? 'rgba(69, 69, 137, 0.06)' : (h ? 'rgba(69, 69, 137, 0.03)' : 'transparent'),
        borderRadius: 8, color: '#363643',
        font: '500 13px Inter, system-ui', letterSpacing: '-0.01em',
        transition: 'background .12s',
        position: 'relative',
      }}>
      <NSIcon src={item.icon} size={16} style={{ opacity: isActive ? 0.95 : 0.7 }} />
      {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
      {!collapsed && item.badge && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          font: '600 11px Inter, system-ui', color: '#79797D',
        }}>
          {item.badge}
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F52163' }} />
        </span>
      )}
      {collapsed && item.badge && (
        <span style={{
          position: 'absolute', top: 4, right: 4,
          width: 6, height: 6, borderRadius: '50%', background: '#F52163',
        }} />
      )}
    </button>
  );
};

const SideNav = ({ current, onNavigate, collapsed, onToggleCollapse }) => (
  <aside style={{
    width: collapsed ? 56 : 224, flexShrink: 0, background: '#fff',
    display: 'flex', flexDirection: 'column',
    boxShadow: 'inset -0.5px 0 0 rgba(69,69,137,0.06)',
    transition: 'width .2s ease',
  }}>
    <WalletPicker collapsed={collapsed} />
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {NAV_ITEMS.map(item => (
        <NavRow key={item.id} item={item} active={current === item.id} onClick={() => onNavigate(item.id)} collapsed={collapsed} />
      ))}
    </nav>

    <div style={{ flex: 1 }} />

    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 8 }}>
      {NAV_FOOTER.map(item => (
        <NavRow key={item.id} item={item} active={current === item.id} onClick={() => onNavigate(item.id)} collapsed={collapsed} />
      ))}
      <button onClick={onToggleCollapse} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        margin: collapsed ? '4px 8px 12px' : '4px 14px 12px',
        padding: collapsed ? '7px 0' : '7px 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left',
        color: '#79797D', font: '500 13px Inter, system-ui',
      }}>
        <NSIcon src={collapsed ? '../../assets/icons/chevron/right.svg' : '../../assets/icons/chevron/left.svg'} size={12} style={{ opacity: 0.6 }} />
        {!collapsed && 'Collapse'}
      </button>
    </nav>
  </aside>
);

const Header = ({ title, right, search = true, filter = true }) => (
  <header style={{
    height: 56, padding: '0 24px',
    display: 'flex', alignItems: 'center', gap: 16,
    background: '#F8F8FA',
  }}>
    <h1 style={{ font: 'var(--type-title)', letterSpacing: '-0.016em', flex: 1 }}>{title}</h1>
    {right}
    {search && <SearchInput />}
    {filter === true && (
      <button style={{
        width: 30, height: 30, border: 0, background: '#fff', borderRadius: 8,
        boxShadow: 'var(--card-shadow)', cursor: 'pointer', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <NSIcon src="../../assets/icons/func/filter.svg" size={14} style={{ opacity: 0.55 }} />
      </button>
    )}
    {filter && filter !== true && filter}
  </header>
);

Object.assign(window, { SideNav, Header, NAV_ITEMS, NAV_FOOTER });
