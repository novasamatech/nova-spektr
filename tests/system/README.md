# System Tests

This document provides instructions on how to run system tests for the Nova Spektr project. You can run these tests
either directly on your machine or inside a Docker container.

## Running without docker

Follow these steps to run the system tests without Docker:

1. Install the project dependencies:

```bash
bun install
```

2. Install the required browsers:

```bash
bun run pretest:system
```

3. Start the application:

```bash
bun run start:renderer
```

4. Run the system tests:

```bash
bun run test:system
```

5. To view the test results, use:

```bash
bun exec playwright show-report
```

You can also run the tests in UI mode or test generation mode:

- For UI mode:

```bash
bun test:system:ui-mod
```

- For test generation mode:

```bash
bun test:system-generator
```

## Running with docker

If you prefer to run the system tests inside a Docker container, follow these steps:

1. Build and start the Docker container:

```bash
docker-compose up -d --build
```

2. Run the system tests:

```bash
bun run test:system
```

Future Improvements

- Implement a feature to store test reports for future reference.
- Save screenshots after each test run for visual verification.
