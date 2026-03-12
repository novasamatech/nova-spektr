---
name: nova-prototype
description: "Generate Nova Spektr UI prototype views as Storybook stories. Creates interactive .stories.tsx files using real project components with mock data — no business logic, no API calls. Use when: user asks to prototype a screen, build a UI mockup, create a feature demo, or prepare a presentation view."
user_invocable: true
---

# Nova Spektr Prototype Generator

Generate a `.stories.tsx` file in `src/renderer/stories/prototypes/` that renders a fully interactive UI prototype using real project components with static mock data.

## STEP 1: Understand the request

Ask clarifying questions if needed:
- What feature/screen to prototype?
- Full page or modal/dialog?
- What data should be displayed?
- Any specific interactions (tabs, filters, modals, accordions)?

## STEP 2: Study real app patterns

Before building, read source code in `src/renderer/pages/`, `src/renderer/features/`, `src/renderer/widgets/` that is closest to the requested prototype. Match the real app's:
- Layout structure (header, content area, sidebar)
- Spacing and information density
- Typography hierarchy
- Component usage patterns

## STEP 3: Generate the prototype

Create `src/renderer/stories/prototypes/<feature-name>.stories.tsx`

## STEP 4: Verify against real app

After generating the prototype, compare the output with the actual app components to check visual fidelity. Run through this checklist:

1. **Read the real components** — Open the corresponding `features/*/ui/` and `pages/*/` source files. Focus on the JSX structure, className strings, spacing values, and component hierarchy.
2. **Compare layout patterns** — Check:
   - Container backgrounds, padding, border-radius (`bg-block-background-default`, `p-4`, `rounded-sm`)
   - Spacing between elements (`gap-x-2`, `gap-y-4`, `gap-y-2`, `gap-y-1.5`)
   - Typography components and their text color classes (`BodyText` vs `FootnoteText` vs `HelpText`)
   - Icon sizes, colors, and placement (real app often uses `size={14}` inline icons, NOT large circle backgrounds)
   - Button variants (`variant="fill" pallet="secondary" size="sm"` for action buttons, not `variant="text"`)
3. **Check domain components** — Verify that the real app uses:
   - `WalletIcon` with badge overlays (not custom circle icons) for wallet/proxy notifications
   - Small inline `Icon` components (14px) for status indicators in operation notifications
   - `BodyText` for titles (not `FootnoteText`) and `BodyText className="text-text-secondary"` for descriptions
   - `FootnoteText className="text-text-tertiary"` for timestamps only
4. **Fix discrepancies** — Update the prototype to match. Common mismatches:
   - Using custom colored circle icons instead of real app's inline icons or WalletIcon
   - Wrong typography component hierarchy (e.g., FootnoteText where BodyText should be)
   - Wrong button variant (text link vs filled secondary)
   - Missing `inline-flex flex-wrap items-center` on description rows
   - Wrong gap/padding values

If uncertain about a pattern, always defer to the real source code in `features/` and `pages/`.

## STEP 5: Lint & format

After generating the prototype, **always** run formatting and lint auto-fix:

```bash
npx prettier --write src/renderer/stories/prototypes/<feature-name>.stories.tsx
npx eslint --fix src/renderer/stories/prototypes/<feature-name>.stories.tsx
```

This fixes:
- **Tailwind class ordering** — the project uses `prettier-plugin-tailwindcss` which enforces a specific class order (e.g. `flex min-h-[600px] w-full` not `w-full min-h-[600px] flex`)
- **JSX prop ordering** — `react/jsx-sort-props` requires callbacks after regular props
- **Import ordering** — `import-x/order` enforces strict import grouping
- **Prettier formatting** — line wrapping, trailing commas, etc.

Then run type-checking on the generated file:

```bash
pnpm types:go
```

Fix any type errors before considering the prototype done. Common type issues:
- `Counter` uses `children`, not a `count` prop: `<Counter variant="waiting">{5}</Counter>`
- `Chain` mock objects need `as unknown as Chain` cast
- `Address` is a branded type — always cast: `'5Grwv...' as Address`

After all fixes, the only acceptable warnings are `@typescript-eslint/consistent-type-assertions` from `as Address` casts (unavoidable for mock data).

## STEP 6: Self-update this skill

After completing the prototype, update **this skill file** (`.claude/commands/nova-prototype.md`) if any of the following happened during the task:

1. **New shared component created** in `_shared/components.tsx` — add it to the "Shared Prototype Components" import list with a comment describing what it does
2. **New mock data added** to `_shared/mock-data.ts` — update the "Shared Prototype Components" import list and "Mock Data Patterns" section
3. **New helper function** in `_shared/helpers.ts` — add to the import list
4. **New `_shared/` barrel export** in `_shared/index.ts` — ensure import list matches
5. **New prototype story created** — no skill update needed (stories are self-documenting)
6. **Component API gotcha discovered** (e.g., wrong prop name, required prop, type mismatch) — add to the "Rules" section or the relevant component docs to prevent repeating the mistake
7. **New layout pattern** used that isn't documented — add to "App Layout Patterns" section

**How to update:**
- Read the current skill file first
- Make minimal, targeted edits — only add/change what's new
- Keep examples concise (1-3 lines, not full components)
- Don't duplicate information already in `_shared/` source files — reference them instead

**Skip this step** if no new reusable patterns, components, or API gotchas were introduced.

---

# Component Reference

## Allowed Imports (ONLY these sources)

```tsx
import { ... } from '@/shared/ui';
import { ... } from '@/shared/ui-kit';
import { ... } from '@/shared/ui-entities';
import type { Address } from '@/shared/core';
```

---

## @/shared/ui — Core UI Components

### Typography
All accept `className` prop:
- `LargeTitleText` — largest headings
- `TitleText` — page titles
- `HeaderTitleText` — header titles
- `SmallTitleText` — smaller section titles
- `HeadlineText` — headlines
- `BodyText` — body copy
- `FootnoteText` — small text, table cells
- `CaptionText` — captions, labels
- `LabelText` — form labels
- `HelpText` — smallest helper text

### Button
```tsx
<Button
  variant="fill" | "text" | "chip"  // default: "fill"
  pallet="primary" | "secondary" | "error"  // default: "primary"
  size="md" | "sm"  // default: "md"
  prefixElement={<Icon name="add" size={16} />}
  suffixElement={<Icon name="chevronDown" size={16} />}
  disabled={false}
  onClick={() => {}}
>
  Label
</Button>
```

### IconButton
```tsx
<IconButton name="close" onClick={() => {}} className="text-icon-default" />
```

### Icon
```tsx
<Icon name="transferConfirm" size={20} className="text-icon-accent" />
```

Available icon names by category:

**Functional (most used):** calendar, copy, close, checkmark, search, add, addCircle, edit, delete, refresh, link, lock, eye, eyeSlashed, export, share, more, rename, switch, details, history, empty, delegate, positive, negative, evidence, salary, withdraw, request, volume, import, uploadFile, currency, referendum, promote, retain, multisigOutline, checkmarkOutline, closeOutline, checkmarkCutout, warnCutout, emptyIdenticon, settingsLite, viewValidators, magic, questionOutline, editKeys, forget, update, opengovLock, opengovVotingLock, opengovDelegations, voted, votingCheckFilled, thumbUp, thumbDown, minusCircle, whitelistVoting, rfcVoting, approveFellowshipVoting, promoteVoting, createPureProxy, changeSignatories

**Navigation:** asset, governance, fellowshipNav, operations, settings, staking, addressBook, notification, network

**Arrows:** arrowLeft, arrowRight, sendArrow, receiveArrow, swapArrow, crossChain, arrowCurveLeftRight, arrowDoubleDown, arrowDoubleUp

**Chevrons:** up, right, down, left, shelfDown, shelfRight, checked, semiChecked, embed

**Confirm (operation icons):** transferConfirm, crossChainConfirm, unknownConfirm, startStakingConfirm, redeemConfirm, unstakeConfirm, destinationConfirm, stakeMoreConfirm, changeValidatorsConfirm, returnToStakeConfirm, proxyConfirm, addDelegationConfirm, editDelegationConfirm, revokeDelegationConfirm, multisigCreationConfirm, activateConfirm, deactivateConfirm, vestedTransferConfirm, multiTransfer

**Staking:** redeem, changeValidators, setValidators, returnToStake, unstake, destination, stakeMore, startStaking

**Misc:** logo, logoTitle, qrFrame, noResults, noWallets, document, ethereum

**Aesthetic:** loader, fire, clock, globe, info, warn, chat, question, fellowship, polkadot, rocket, stake, treasury, voting, individual, organization, members, profile, hiddenWallet, hourglass

**MST (multisig transaction icons):** transferMst, unknownMst, startStakingMst, redeemMst, unstakeMst, destinationMst, stakeMoreMst, changeValidatorsMst, returnToStakeMst, proxyMst, voteMst, revoteMst, retractMst, unlockMst, delegateMst, undelegateMst, editDelegationMst, vestedTransferMst

**Fellowship:** promotionRank1-9, retentionRank1-9, withdrawSalary, requestSalary, activateSalary, submitPromotionEvidence, submitRetentionEvidence, rfc, whitelist, spend

**Wallet types:** vault, novaWallet, walletConnect, proxied, polkadotExtension, talismanExtension, subwalletExtension (+ Background/Onboarding variants)

### Other UI Components
```tsx
<Plate className="p-4">Card container</Plate>
<Separator />  // horizontal rule
<Shimmering width={100} height={20} />  // skeleton placeholder
<OperationStatus pallet="success" | "error" | "default" />
<DetailRow label="Fee">0.01 DOT</DetailRow>  // label-value pair
<Switch checked={true} onChange={() => {}} />
<Alert active={true} variant="info" | "warn" | "error" title="Alert title">Content</Alert>
<Loader />
<Counter variant="waiting" | "success">{5}</Counter>
<StatusLabel variant="success" | "warn" | "error" | "waiting">Text</StatusLabel>
<Header title="Page Title" />
```

---

## @/shared/ui-kit — Design System Kit

### Modal
```tsx
<Modal isOpen={open} onToggle={setOpen} size="sm" | "md" | "mdlg" | "lg" | "xl" | "xxl" | "full" | "fit">
  <Modal.Title close>Title</Modal.Title>
  <Modal.Content>Body</Modal.Content>
  <Modal.Footer>
    <Button>Submit</Button>
  </Modal.Footer>
</Modal>
```

### Input
```tsx
<Input
  height="sm" | "md"
  width="md" | "full"
  placeholder="Enter value"
  value={val}
  onChange={(stringValue) => {}}  // receives string, NOT event
  invalid={false}
/>
```

### Select
```tsx
<Select placeholder="Choose" value={val} onChange={(stringValue) => {}}>
  <Select.Item value="opt1">Option 1</Select.Item>
  <Select.Item value="opt2">Option 2</Select.Item>
</Select>
```

### Tabs (REQUIRED: value + onChange)
```tsx
<Tabs value={tab} onChange={setTab}>
  <Tabs.List>
    <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
    <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="tab1">Content 1</Tabs.Content>
  <Tabs.Content value="tab2">Content 2</Tabs.Content>
</Tabs>
```

### Accordion
```tsx
<Accordion initialOpen={false}>
  <Accordion.Trigger>Click to expand</Accordion.Trigger>
  <Accordion.Content>Expanded content</Accordion.Content>
</Accordion>
```

### Other ui-kit Components
```tsx
<Surface elevation={0 | 1 | 2} className="p-4">Card with elevation</Surface>
<Box direction="column" | "row" gap={4} padding={[4, 4]}>Layout box</Box>
<SearchInput value={q} onChange={setQ} placeholder="Search" />
<Checkbox checked={true} onChange={() => {}}>Label</Checkbox>
<RadioGroup value={val} onChange={setVal}>
  <RadioGroup.Option value="a">Option A</RadioGroup.Option>
</RadioGroup>
<Tooltip>
  <Tooltip.Trigger><Button>Hover me</Button></Tooltip.Trigger>
  <Tooltip.Content>Tooltip text</Tooltip.Content>
</Tooltip>
<Popover>
  <Popover.Trigger><Button>Open</Button></Popover.Trigger>
  <Popover.Content>Popover body</Popover.Content>
</Popover>
<ScrollArea>Scrollable content (no className — use wrapper div)</ScrollArea>
<Skeleton className="h-4 w-20" />
<Label label="Field name" variant="default" | "top"><Input /></Label>
<Copy value="text to copy"><button type="button">Click to copy</button></Copy>  // value prop (NOT text), requires ReactElement child
<Combobox value={v} options={[{id:'1', element:<span>Opt</span>, value:'1'}]} onChange={setV} placeholder="Search..." />
<Timeline steps={[{ title: 'Step 1', status: 'done' }]} />
<StepIndicator steps={[{ id: '1', label: 'Step 1' }]} activeStep="1" />
<Progress value={60} max={100} />
<ConfirmModal isOpen onClose={() => {}} onConfirm={() => {}} title="Confirm" description="Are you sure?" />
```

---

## @/shared/ui-entities — Domain Components

### Identicon (address avatar)
```tsx
// Standalone (with background circle)
<Identicon address={'5Grwva...' as Address} size={32} theme="polkadot" />

// Inline in description text (no background, smaller)
<Identicon address={'5Grwva...' as Address} size={16} background={false} />
```

### Hash (address/hash display)
```tsx
<Hash value="0x1234..." variant="full" | "truncate" | "short" />
```

### WalletIcon
**IMPORTANT:** `WalletIcon` takes `WalletType` enum, NOT string literals. Always import and use:
```tsx
import { WalletType } from '@/shared/core';

<WalletIcon type={WalletType.MULTISIG} size={20} />
```

Available `WalletType` enum values:
- `WalletType.POLKADOT_VAULT` (`'wallet_pv'`)
- `WalletType.MULTISIG` (`'wallet_ms'`)
- `WalletType.FLEXIBLE_MULTISIG` (`'wallet_fxms'`)
- `WalletType.WATCH_ONLY` (`'wallet_wo'`)
- `WalletType.NOVA_WALLET` (`'wallet_nw'`)
- `WalletType.WALLET_CONNECT` (`'wallet_wc'`)
- `WalletType.PROXIED` (`'wallet_pxd'`)
- `WalletType.POLKADOT_EXTENSION` (`'wallet_polkadot_ext'`)
- `WalletType.TALISMAN_EXTENSION` (`'wallet_talisman_ext'`)
- `WalletType.SUBWALLET_EXTENSION` (`'wallet_subwallet_ext'`)

#### Wallet icon with badge overlay (for wallet-created / proxy notifications)
Use `WalletIconWithBadge` from `_shared/`:
```tsx
import { WalletIconWithBadge } from './_shared';

<WalletIconWithBadge type={WalletType.MULTISIG} badgeColor="bg-icon-positive" />  // created/added
<WalletIconWithBadge type={WalletType.PROXIED} badgeColor="bg-icon-negative" />   // removed
```

#### Inline wallet icon in description text
```tsx
<span className="mr-1">
  <WalletIcon type={wallet.type} size={16} />
</span>
```

### ChainIcon (with mock Chain objects)
`ChainIcon` requires a `Chain` object (not a string ID). Use mock chains from `_shared/`:
```tsx
import { MOCK_CHAINS, getChain, mockChain } from './_shared';

// Pre-built chains:
MOCK_CHAINS.polkadot    // Polkadot
MOCK_CHAINS.kusama      // Kusama
MOCK_CHAINS.polkadotAssetHub  // Polkadot Asset Hub
MOCK_CHAINS.westend     // Westend

// Lookup by name:
getChain('Polkadot')    // returns MOCK_CHAINS.polkadot

// Custom chain (for chains not in MOCK_CHAINS):
mockChain('Acala', 'Acala', '0x...')
```

**Known icon filenames** (case-sensitive, verified):
| Chain | Icon filename |
|-------|--------------|
| Polkadot | `Polkadot` |
| Kusama | `Kusama` |
| Polkadot Asset Hub | `Polkadot_Asset_Hub` |
| Kusama Asset Hub | `Statemine` |
| Westend | `Westend` |
| Acala | `Acala` |
| Moonbeam | `Moonbeam` |
| Astar | `Astar` |
| Hydration | `HydraDX` |

Usage:
```tsx
<ChainIcon chain={MOCK_CHAINS.polkadot} size={16} />
```

#### Inline chain title (ChainIcon + name)
Use `InlineChainTitle` from `_shared/` (matches real `<ChainTitle>`):
```tsx
import { InlineChainTitle } from './_shared';

<InlineChainTitle chainName="Polkadot" />                    // lookup by name
<InlineChainTitle chain={MOCK_CHAINS.polkadot} />            // pass chain object
<InlineChainTitle chainName="Kusama" fontClass="text-text-primary" />  // custom font
```

### Account (renders identicon + name + address)
```tsx
<Account address={'5Grwva...' as Address} name="My Account" />
```

### AssetBalance
```tsx
// Complex type — for prototypes prefer plain text display instead
<AssetBalance value="1000000000" asset={assetObject} />
```

### Other Entity Components
- `AccountSelect` — account picker dropdown
- `AccountSelectModal` — account picker in modal
- `ChainSelect` — chain picker
- `VoteChart` / `DynamicVoteChart` — governance vote visualization
- `CollectiveRank` — fellowship rank badge
- `TrackDescription` — governance track info
- `SignatorySelect` — signatory picker
- `RankedAccount` — account with fellowship rank
- `WalletOnboardingCard` — onboarding step card
- `TransactionDetails` — tx detail block

---

## Inline Identity Patterns

The real app renders wallet/address/chain references inline using `<Trans>` components. For prototypes, replicate these patterns directly:

### Wallet reference (WalletIcon + name)
```tsx
<span className="mx-2 inline-flex items-center">
  <span className="mr-1"><WalletIcon type={wallet.type} size={16} /></span>
  <span className="text-button-large text-text-primary">{wallet.name}</span>
</span>
```

### Address reference (Identicon + truncated hash)
```tsx
<span className="inline-flex items-center">
  <span className="mx-1 inline-flex">
    <Identicon address={address} size={16} background={false} />
  </span>
  <span className="text-text-primary">
    <Hash value={address} variant="truncate" />
  </span>
</span>
```

### Wallet-or-address fallback (when wallet type may be unknown)
```tsx
<span className="mr-1">
  {walletType ? (
    <WalletIcon size={16} type={walletType} />
  ) : (
    <Identicon address={address} size={16} background={false} />
  )}
</span>
```

### Chain reference (ChainIcon + name inline)
```tsx
import { InlineChainTitle } from './_shared';

<InlineChainTitle chainName="Polkadot" />                          // secondary context (default)
<InlineChainTitle chainName="Kusama" fontClass="text-text-primary" />  // when chain is the main subject
```

---

## App Layout Patterns

### Full Page Layout
```tsx
<div className="flex min-h-[600px] w-full flex-col bg-main-app-background">
  {/* Header bar */}
  <div className="flex items-center justify-between border-b border-container-border bg-top-nav-bar-background px-6 pt-4 pb-[15px]">
    <TitleText className="py-[3px] text-text-primary">Page Title</TitleText>
    <div className="w-[230px]">
      <SearchInput value={search} onChange={setSearch} placeholder="Search" />
    </div>
  </div>

  {/* Content area */}
  <div className="mx-auto flex h-full w-full max-w-[1084px] flex-col">
    {/* Tabs + filters */}
    <div className="flex items-center justify-between py-4">
      <Tabs value={tab} onChange={setTab}>...</Tabs>
      <div className="flex items-center gap-2">...</div>
    </div>

    {/* Content */}
    <div className="flex-1 overflow-y-auto pb-10">...</div>
  </div>
</div>
```
Use `parameters: { layout: 'fullscreen' }` in story meta.

### Centered Component / Modal
```tsx
<div className="w-[480px] p-6">
  {/* Component content */}
</div>
```
Use `parameters: { layout: 'centered' }` in story meta.

### Table-like Rows (Operations, Assets)
```tsx
<div className="rounded bg-block-background-default hover:shadow-card-shadow">
  <Accordion>
    <Accordion.Trigger>
      <div className="flex items-center h-[52px] w-full px-4 py-2">
        {/* Fixed-width columns */}
        <div className="flex items-center gap-x-2 w-[500px] shrink-0">...</div>
        <div className="flex flex-1 items-center">...</div>
      </div>
    </Accordion.Trigger>
    <Accordion.Content>
      <div className="border-t border-divider grid grid-cols-3 divide-x divide-divider py-4">
        <div className="px-4">Column 1</div>
        <div className="px-4">Column 2</div>
        <div className="px-4">Column 3</div>
      </div>
    </Accordion.Content>
  </Accordion>
</div>
```

### Filter Bar
```tsx
<div className="flex h-9 items-center gap-2">
  <div className="w-[136px]">
    <Select placeholder="Filter" value="" onChange={() => {}}>
      <Select.Item value="opt">Option</Select.Item>
    </Select>
  </div>
</div>
```

### Empty State
```tsx
<div className="flex flex-col items-center justify-center py-20 gap-3">
  <Icon name="document" size={48} className="text-icon-default" />
  <FootnoteText className="text-text-tertiary">No items found</FootnoteText>
</div>
```

### Status Badge
```tsx
<div className="flex w-fit items-center rounded-[20px] border border-shade-8 px-2.5 py-1">
  <CaptionText className="text-text-secondary uppercase">Status text</CaptionText>
</div>
```

### Detail Section (key-value pairs)
```tsx
<div className="flex flex-col gap-y-2">
  <DetailRow label="Label" className="text-text-secondary">
    <FootnoteText className="text-text-secondary">Value</FootnoteText>
  </DetailRow>
</div>
```

### Shared Prototype Components (`_shared/`)

Reusable building blocks live in `src/renderer/stories/prototypes/_shared/`. Import from `./_shared` in your stories:

```tsx
import {
  AccountIdenticon,    // Identicon + WalletIcon badge overlay
  CopyableIconButton,  // Copy icon button with optional tooltip
  CopyableValue,       // Truncated hash/address with copy + hover
  CreateNewButton,     // Dashed border "create new" action
  InlineChainTitle,    // ChainIcon + chain name inline (accepts chainName string or chain object)
  MOCK_ADDRESSES,      // alice, bob, charlie, dave, eve (as Address)
  MOCK_CHAINS,         // polkadot, kusama, polkadotAssetHub, westend (as Chain)
  SectionBadge,        // Count pill for section headers
  SignatoryRow,        // Row with icon + name + SIGNED/UNSIGNED badge
  StatusPill,          // Generic status pill (default/positive/negative/accent)
  WalletIconWithBadge, // WalletIcon + colored dot indicator
  getChain,            // Lookup chain by name string
  mockChain,           // Create mock Chain object
  truncateStr,         // Truncate long strings: truncateStr(hash, 7, 8)
} from './_shared';
```

See source files for full API:
- **`_shared/helpers.ts`** — `truncateStr(str, start?, end?)`
- **`_shared/mock-data.ts`** — `MOCK_ADDRESSES`, `MOCK_CHAINS`, `mockChain()`, `getChain()`
- **`_shared/components.tsx`** — all UI components listed above (including `InlineChainTitle`)

### Expanded Accordion — 3-Column Detail View
Real app uses `grid grid-cols-3` for expanded operation details. Each column needs `min-w-0` to prevent overflow:
```tsx
<Accordion.Content>
  <div className="border-t border-divider">
    <div className="grid grid-cols-3">
      <div className="flex min-w-0 flex-col gap-y-4 border-r border-divider p-4">
        <SmallTitleText>Details</SmallTitleText>
        <div className="flex flex-col gap-y-2">
          <DetailRow label="Depositor" className="text-text-secondary">...</DetailRow>
        </div>
      </div>
      <div className="flex min-w-0 flex-col border-r border-divider p-4">
        <SmallTitleText>Signatories</SmallTitleText>
        <ul className="flex flex-col">
          <SignatoryRow icon={<WalletIcon type={WalletType.POLKADOT_VAULT} size={20} />} signed={true}>
            <BodyText className="truncate text-text-secondary">Wallet name</BodyText>
          </SignatoryRow>
        </ul>
      </div>
      <div className="flex min-w-0 flex-col gap-y-4 p-4">
        <SmallTitleText>Advanced</SmallTitleText>
        <DetailRow label="Call Hash"><CopyableValue value={hash} /></DetailRow>
      </div>
    </div>
  </div>
</Accordion.Content>
```

### Step Wizard in Modal
```tsx
// Step indicator
<div className="flex items-center gap-2 justify-center">
  {steps.map((_, i) => (
    <div key={i} className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
        i + 1 === current ? 'bg-icon-accent text-white'
        : i + 1 < current ? 'bg-icon-positive text-white'
        : 'bg-input-background-disabled text-text-tertiary'
      }`}>
        {i + 1 < current ? '✓' : i + 1}
      </div>
      {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i + 1 < current ? 'bg-icon-positive' : 'bg-divider'}`} />}
    </div>
  ))}
</div>
```

### Chain Icon (prefer real ChainIcon with mock Chain objects)
Use `ChainIcon` with mock `Chain` objects (see "ChainIcon" in Domain Components section above). Only use colored dot fallback if ChainIcon cannot work in your context:
```tsx
<div className="w-[32px] h-[32px] rounded-full shrink-0 bg-[#E6007A]" />  // Polkadot pink
<div className="w-[32px] h-[32px] rounded-full shrink-0 bg-[#000000]" />  // Kusama black
```

---

## Tailwind CSS Token Classes

### Text Colors
`text-text-primary`, `text-text-secondary`, `text-text-tertiary`, `text-text-positive`, `text-text-negative`, `text-text-warning`, `text-action-text`, `text-tab-text-accent`

### Icon Colors
`text-icon-accent`, `text-icon-default`, `text-icon-positive`, `text-icon-warning`, `text-icon-negative`, `text-icon-hover`, `text-icon-active`

### Backgrounds
`bg-main-app-background`, `bg-top-nav-bar-background`, `bg-left-navigation-menu-background`, `bg-block-background-default`, `bg-token-container-background`, `bg-input-background`, `bg-input-background-disabled`, `bg-badge-background`, `bg-action-background-hover`, `bg-tab-background`, `bg-icon-accent`, `bg-icon-positive`, `bg-icon-warning`, `bg-icon-negative`

### Borders
`border-container-border`, `border-divider`, `border-filter-border`, `border-active-container-border`

### Shadows
`shadow-card-shadow`

---

## Mock Data Patterns

### Polkadot SS58 Addresses
Import from `_shared` instead of defining locally:
```tsx
import { MOCK_ADDRESSES } from './_shared';
// MOCK_ADDRESSES.alice, .bob, .charlie, .dave, .eve — all typed as Address
```

### Amounts
`'1,000 DOT'`, `'5.5 KSM'`, `'0.01 DOT'`, `'$4,200'`, `'$110'`

### Networks
`'Polkadot'`, `'Kusama'`, `'Polkadot Asset Hub'`, `'Acala'`, `'Moonbeam'`, `'Astar'`, `'Westend'`

### Tx Hashes
`'0x8a3f9b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a'`

---

## Rules

1. Import ONLY from `@/shared/ui`, `@/shared/ui-kit`, `@/shared/ui-entities`, `@/shared/core`
2. **DO NOT** wrap with ThemeProvider, I18Provider, or NotificationProvider — global decorators handle this
3. No API calls, no fetch, no async — static mock data only
4. No business logic — only UI state with `useState`/`useReducer`
5. If a component doesn't exist — build inline with existing components + Tailwind
6. Use realistic Polkadot/Kusama mock data
7. Use Tailwind for layout; `Box` for semantically clearer layouts
8. Story title: `Prototypes/<FeatureName>`
9. Use `import type { Meta, StoryObj } from '@storybook/react-vite'`
10. Arrow function components (linting rule)
11. **DO NOT** add `eslint-disable-next-line i18next/no-literal-string` comments — the `i18next` rule is excluded for `*.stories.tsx` files, and these comments cause "Definition for rule not found" errors
12. `Address` is a branded type — always cast: `'5Grwv...' as Address`
13. `Tabs` REQUIRES both `value` and `onChange`
14. `Alert` REQUIRES `active` boolean prop
15. `Accordion` sub-components: `.Trigger` and `.Content` (NOT `.Button`)
16. `Input.onChange` receives **string**, not event
17. `OperationStatus.pallet` only accepts `'success' | 'error' | 'default'` (no 'waiting')
18. `ScrollArea` does NOT accept `className` — wrap in a div

## Template

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Button, BodyText, FootnoteText, TitleText, Icon, IconButton, CaptionText, HelpText, Separator } from '@/shared/ui';
import { Modal, Input, Select, Surface, Box, Tabs, SearchInput, Accordion } from '@/shared/ui-kit';
import { Identicon, Hash } from '@/shared/ui-entities';

import { MOCK_ADDRESSES, MOCK_CHAINS, InlineChainTitle, StatusPill } from './_shared';

// ─── Main prototype ──────────────────────────────────────────────────────────

const FeaturePrototype = () => {
  const [tab, setTab] = useState('main');
  const [search, setSearch] = useState('');

  return (
    <div className="flex min-h-[600px] w-full flex-col bg-main-app-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-container-border bg-top-nav-bar-background px-6 pt-4 pb-[15px]">
        <TitleText className="py-[3px] text-text-primary">Feature Name</TitleText>
        <div className="w-[230px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search" />
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto flex h-full w-full max-w-[1084px] flex-col">
        <div className="flex items-center justify-between py-4">
          <Tabs value={tab} onChange={setTab}>
            <Tabs.List>
              <Tabs.Trigger value="main">Main</Tabs.Trigger>
              <Tabs.Trigger value="other">Other</Tabs.Trigger>
            </Tabs.List>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto pb-10">
          {/* Content here */}
        </div>
      </div>
    </div>
  );
};

const meta: Meta<typeof FeaturePrototype> = {
  component: FeaturePrototype,
  title: 'Prototypes/FeatureName',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof FeaturePrototype>;
export const Default: Story = {};
```

---

## Pages & Screens Reference

Use these as reference for understanding real app layout patterns:

| Screen | Path | Key Components | Layout |
|--------|------|----------------|--------|
| Assets | `pages/Assets/` | Tabs, SearchInput, AssetBalance, ChainIcon, Accordion rows | Full page, table rows grouped by chain |
| Operations | `pages/Operations/` | Tabs (pending/history), Accordion rows, filters, StatusBadge | Full page, date-grouped operation rows |
| Staking | `pages/Staking/` | Tabs, Table, validators list, staking info cards | Full page with tabs |
| Governance | `pages/Governance/` | Tabs (referenda/delegations), VoteChart, referendum cards | Full page with filtering |
| Fellowship | `pages/Fellowship/` | Tabs (overview/members/activity), CollectiveRank, RankedAccount | Full page with sidebar |
| Settings | `pages/Settings/` | Tabs (networks/currency/overview), forms, Select | Full page settings form |
| Address Book | `pages/AddressBook/` | ContactList, SearchInput, Modal (add/edit contact) | Full page contact list |
| Notifications | `pages/Notifications/` | Notification cards, read/unread states | Full page notification list |
| Send Asset | `pages/Assets/SendAsset/` | Multi-step modal flow, Input, Select, account selection | Modal wizard |
| Receive Asset | `pages/Assets/ReceiveAsset/` | QR code display, address copy | Modal/centered |

## Widgets Reference

| Widget | Purpose |
|--------|---------|
| `Transfer/` | Transfer flow modal with steps |
| `Staking/` | Staking operation widgets |
| `VoteModal/` | Governance voting modal |
| `DelegateModal/` | Delegation flow |
| `ManageContactModal/` | Add/edit contact |
| `CurrencyModal/` | Currency selection |
| `UnlockModal/` | Token unlock flow |
| `DelegateDetails/` | Delegate information panel |
| `ReferendumEndTimer/` | Countdown timer for referenda |

## Features Reference (most relevant for prototypes)

| Feature | Purpose | Key UI |
|---------|---------|--------|
| `wallet-select/` | Wallet picker sidebar | WalletIcon, Identicon, account list |
| `wallet-details/` | Wallet detail panel | Account list, chain info, balance |
| `multisig-operations/` | Multisig tx management | Operation rows, signatory list |
| `staking/` | Staking management | Validator list, staking info |
| `governance/` | Governance voting | Referendum cards, vote charts |
| `fellowship-*/` | Fellowship features | Rank display, member list, salary |
| `operations/` | Operation history | Operation list, filters |
| `assets/` | Asset management | Balance display, chain grouping |
| `contacts/` | Contact management | Contact list, add/edit forms |
| `proxy-*/` | Proxy management | Proxy list, add/remove flows |
| `navigation/` | App navigation sidebar | Nav items, wallet selection |
| `network/` | Network management | Chain status, RPC selection |
| `notifications/` | In-app notifications | Notification list, badges |

## Entity UI Components

| Entity | Components | Path |
|--------|-----------|------|
| `asset/ui/` | AssetDetails, AssetLinks, EmptyAssetsState | Asset information display |
| `chain/ui/` | ChainTitle, OperationTitle, XcmChains | Chain info display |
| `contact/ui/` | ContactList, ContactRow, EmptyContactList | Contact rendering |
| `governance/ui/` | BalanceDiff, VoteCharts, TrackInfo, TracksDetails, ReferendumTimer | Governance data |
| `operations/ui/` | OperationTitleDate, OperationTitleStatus, SignButton, Status | Operation display |
| `price/ui/` | AssetFiatBalance, FiatBalance, Price, TokenPrice | Price/fiat display |
| `proxy/ui/` | ProxyAccount, ProxyPopover, PureProxyPopover | Proxy information |
| `signatory/ui/` | SelectableSignatory, SignatoryCard | Signatory display |
