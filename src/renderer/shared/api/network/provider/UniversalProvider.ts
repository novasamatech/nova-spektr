export function createUniversalProvider() {
  class UniversalProvider {
    static #instance: UniversalProvider;

    static init(): UniversalProvider {
      if (!UniversalProvider.#instance) {
        UniversalProvider.#instance = new UniversalProvider();
      }

      return this.#instance;
    }

    send(message: string) {
      console.log(`MSG OUT: ${message}`);
    }

    connect() {
      console.log('Connecting to UniversalProvider');
    }

    disconnect() {
      console.log('Disconnect to UniversalProvider');
    }
  }

  return UniversalProvider.init();
}
