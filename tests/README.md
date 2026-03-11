# Tests Directory

This directory contains all tests for Nova Spektr.

## Directory Structure

```
tests/
├── integrations/              # Integration tests with storage & state
│   ├── docs/                 # Integration testing documentation
│   ├── utils/                # Test utilities & builders
│   ├── fixtures/             # Test data fixtures
│   ├── tests/                # Integration test examples
│   ├── dataVerification/     # Legacy data verification tests
│   └── migrations/           # Storage migration tests
│
└── system/                   # Playwright E2E tests
    ├── pages/                # Page object models
    ├── tests/                # System test suites
    └── utils/                # E2E test utilities
```

## Test Types

### Integration Tests (`integrations/`)

Feature integration tests with real storage (fake IndexedDB) and Effector state management.

**Quick Start:**
```typescript
import { FeatureTestBuilder } from '@tests/integrations/utils';
import { vaultWallet, senderAccount } from '@tests/integrations/fixtures';

const env = await new FeatureTestBuilder()
  .withWallet(vaultWallet)
  .withAccount(senderAccount)
  .build();

await env.startFeature(myFeature);
await env.cleanup();
```

**Documentation:**
- [Quick Start Guide](./integrations/docs/QUICK_START.md)
- [Full Integration Testing Guide](./integrations/docs/INTEGRATION_TESTING_GUIDE.md)
- [Cheat Sheet](./integrations/docs/CHEAT_SHEET.md)

**Run:**
```bash
pnpm test tests/integrations
```

### System Tests (`system/`)

End-to-end tests using Playwright for full user workflows.

**Run:**
```bash
pnpm test:system
```

## Running Tests

```bash
# All tests
pnpm test

# Integration tests only
pnpm test tests/integrations

# System/E2E tests only
pnpm test:system

# Watch mode
pnpm test:watch

# With UI
pnpm test:ui

# With coverage
pnpm test:coverage
```

## Documentation

- **Integration Tests**: See [integrations/README.md](./integrations/README.md)
- **System Tests**: See [system/README.md](./system/README.md)

---

For more information, see the [main project README](../README.md).
