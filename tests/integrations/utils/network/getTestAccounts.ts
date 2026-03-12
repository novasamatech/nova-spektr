export interface TestAccounts {
  chainId: string;
  name: string;
  account: string;
}

export async function getTestAccounts(url: string) {
  const accounts = await httpRequest(url).then((r) => r?.json());

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- external API response shape
  return accounts as TestAccounts[];
}

export async function httpRequest(url: string): Promise<Response | undefined> {
  try {
    const response = await fetch(url);

    return response;
  } catch (exception) {
    process.stderr.write(`ERROR received from ${url}: ${exception}\n`);
  }
}
