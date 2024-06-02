import fs from 'fs';
import path from 'path';

export async function readConfig(): Promise<any> {
    const chainsFilePath = path.resolve(__dirname, '../../../src/renderer/shared/config/chains/chains.json');
    const chainsData = JSON.parse(fs.readFileSync(chainsFilePath, 'utf-8'));

    return chainsData
}