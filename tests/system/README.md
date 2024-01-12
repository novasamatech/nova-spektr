 # System Tests

This document provides instructions on how to run system tests for the Nova Spektr project. You can run these tests either directly on your machine or inside a Docker container.

 ## Running without docker

 Follow these steps to run the system tests without Docker:

1. Install the project dependencies:
 ```bash
 pnpm install
 ```

2. Install the required browsers:
 ```bash
 pnpm run pretest:system
 ```

3. Start the application:
 ```bash
 pnpm run start:renderer
 ```

4. Run the system tests:
 ```bash
 pnpm run test:system
 ```

5. To view the test results, use:
 ```bash
 pnpm exec playwright show-report
 ```

You can also run the tests in UI mode or test generation mode:

- For UI mode:
```bash
pnpm test:system:ui-mod
```

- For test generation mode:
```bash
pnpm test:system-generator
```

 ## Running with docker

If you prefer to run the system tests inside a Docker container, follow these steps:

1. Build and start the Docker container:
 ```bash
 docker-compose up -d --build
 ```

2. Run the system tests:
 ```bash
 pnpm run test:system
 ```

Future Improvements

- Implement a feature to store test reports for future reference.
- Save screenshots after each test run for visual verification.
