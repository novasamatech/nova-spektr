import { importKeysUtils } from '../import-keys-utils';

describe('entities/dynamicDerivations/import-keys-utils/parseTextFile', () => {
  test('should return null for invalid version', () => {
    const fileContent = `version: 2\npublic address: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`;
    expect(importKeysUtils.parseTextFile(fileContent)).toBeNull();
  });

  test('should return null for invalid public address', () => {
    const fileContent = `version: 1\npublic address: invalid_address`;
    expect(importKeysUtils.parseTextFile(fileContent)).toBeNull();
  });

  test('should return null for missing derivation paths', () => {
    const fileContent = `version: 1\npublic address: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`;
    expect(importKeysUtils.parseTextFile(fileContent)).toBeNull();
  });

  test('should parse text file with regular path', () => {
    const fileContent = `version: 1\npublic address: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\ngenesis: 0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3\n//path: name [type]`;
    const parsedData = importKeysUtils.parseTextFile(fileContent);
    expect(parsedData).toEqual({
      version: '1',
      publicAddress: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      derivationPaths: [
        {
          derivationPath: '//path',
          name: 'name',
          type: 'type',
          chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
        },
      ],
    });
  });

  test('should parse text file with soft and hard path', () => {
    const fileContent = `version: 1\npublic address: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\ngenesis: 0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3\n//hard/soft//hard/soft: name [type]`;
    const parsedData = importKeysUtils.parseTextFile(fileContent);
    expect(parsedData).toEqual({
      version: '1',
      publicAddress: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      derivationPaths: [
        {
          derivationPath: '//hard/soft//hard/soft',
          name: 'name',
          type: 'type',
          chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
        },
      ],
    });
  });

  test('should parse text file with soft path and shards', () => {
    const fileContent = `version: 1\npublic address: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\ngenesis: 0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3\n//soft_path//0...10: name [type]`;
    const parsedData = importKeysUtils.parseTextFile(fileContent);
    expect(parsedData).toEqual({
      version: '1',
      publicAddress: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      derivationPaths: [
        {
          derivationPath: '//soft_path',
          sharded: '10',
          name: 'name',
          type: 'type',
          chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
        },
      ],
    });
  });

  test('should parse text file with hard path and shards', () => {
    const fileContent = `version: 1\npublic address: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\ngenesis: 0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3\n/hard_path//0...10: name [type]`;
    const parsedData = importKeysUtils.parseTextFile(fileContent);
    expect(parsedData).toEqual({
      version: '1',
      publicAddress: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      derivationPaths: [
        {
          derivationPath: '/hard_path',
          sharded: '10',
          name: 'name',
          type: 'type',
          chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
        },
      ],
    });
  });

  test('should parse text file with sharded keys and different derivations', () => {
    const fileContent = `version: 1\npublic address: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\ngenesis: 0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3\n//hard/soft//hard//0...10: name [type]`;
    const parsedData = importKeysUtils.parseTextFile(fileContent);
    expect(parsedData).toEqual({
      version: '1',
      publicAddress: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      derivationPaths: [
        {
          derivationPath: '//hard/soft//hard',
          sharded: '10',
          name: 'name',
          type: 'type',
          chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
        },
      ],
    });
  });

  test('should parse text file with difficult symbols in dp', () => {
    const fileContent = `version: 1\npublic address: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\ngenesis: 0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3\n//polkadot//~!@#$%^&*(*)_+QWE'1234567890-=//0...10: name [type]`;
    const parsedData = importKeysUtils.parseTextFile(fileContent);
    expect(parsedData).toEqual({
      version: '1',
      publicAddress: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      derivationPaths: [
        {
          derivationPath: `//polkadot//~!@#$%^&*(*)_+QWE'1234567890-=`,
          sharded: '10',
          name: 'name',
          type: 'type',
          chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
        },
      ],
    });
  });
});
