# Nova Spektr — Desktop App UI Kit

Hi-fi JSX recreation of the Nova Spektr desktop app chrome and main surfaces.

## Files
- `Primitives.jsx` — `NSButton`, `NSPlate`, `NSBadge`, `NSIdenticon`, `NSAddress`, `NSIcon`, `NSRow`
- `Chrome.jsx` — `SideNav`, `Header`, `SearchInput`, `NavLink`
- `AssetsPage.jsx` — Assets (portfolio) page with token rows
- `GovernancePage.jsx` — Referendum list with vote bars, filters, stats plates
- `StakingPage.jsx` — Staking dashboard + nominators table; also `OperationsPage`
- `index.html` — Click-through shell with working nav

## Scope
Covers the four surfaces most representative of the product's visual language: Assets, Governance, Staking, Operations. Other nav entries (Fellowship, Basket, Contacts, Notifications, Settings, Dashboard) render an empty state — extend here if those screens are needed.

## Fidelity notes
- Tokens read from `colors_and_type.css` (same names as the source codebase).
- Identicons are a visual stand-in — the real app uses Polkadot ss58 identicons.
- Referendum data and nominator rows are representative fixtures.
