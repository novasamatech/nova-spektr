import axios, { type AxiosResponse } from 'axios';

export interface TestAccounts {
  chainId: string;
  name: string;
  account: string;
}

export async function getTestAccounts(url: string) {
  const accounts = await httpRequest(url);

  return <TestAccounts[]>(<unknown>accounts?.data);
}

export async function httpRequest(url: string): Promise<AxiosResponse | undefined> {
  try {
    const response = await axios.get(url);

    return response;
  } catch (exception) {
    process.stderr.write(`ERROR received from ${url}: ${exception}\n`);
  }
}
