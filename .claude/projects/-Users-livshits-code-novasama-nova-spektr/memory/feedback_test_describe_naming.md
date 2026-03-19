---
name: test describe naming
description: Don't name test describe blocks as file paths — use the module/function name instead
type: feedback
---

Don't use file paths as `describe()` labels in tests (e.g. `describe('domains/price/service/coingeckoService')`). Use the module or function name instead (e.g. `describe('coingeckoService')`).

**Why:** The user finds path-based names noisy and redundant — the test runner already shows the file path.

**How to apply:** When writing or modifying test files, use the exported name being tested as the describe label.
