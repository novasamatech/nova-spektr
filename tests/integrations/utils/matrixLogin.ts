import Matrix from '@renderer/services/matrix';

export async function matrixLoginAndSync(matrix: Matrix, login: string, password: string): Promise<void> {
  await matrix.loginWithCreds(login, password);

  while (!matrix.isSynced) {
    await new Promise((resovle) => {
      setTimeout(resovle, 1_000);
    });
  }

  Promise.resolve('Client logged in and sync');
}
