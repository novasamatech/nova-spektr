 # System Tests


 ## Running without docker

 Install dependencies:

 ```bash
 pnpm install
 ```

 Install browsers:

 ```bash
 pnpm run pretest:system
 ```

 To run the application, use the following command:

 ```bash
 pnpm run start:renderer
 ```

 To run the tests, use the following command:

 ```bash
 pnpm run test:system
 ```

 To see results use:

 ```bash
 pnpm exec playwright show-report
 ```

 ## Running with docker

 To run the application, use the following command:

 ```bash
 docker-compose up -d --build
 ```

 To run the tests, use the following command:

 ```bash
 pnpm run test:system
 ```

 ## TODO

 - Implement Report storing
 - Save screenshots after run
