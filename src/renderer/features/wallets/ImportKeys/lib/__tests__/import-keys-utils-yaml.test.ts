import { importKeysUtils } from '../import-keys-utils';

describe('entities/dynamicDerivations/import-keys-utils/parseYamlFile', () => {
  test('should return null for invalid version', () => {
    const fileContent = `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef:
  0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3:
    - key:
        derivation_path: "//polkadot"
version: 777`;
    expect(importKeysUtils.parseYamlFile(fileContent)).toBeNull();
  });

  test('should return null for invalid public address', () => {
    const fileContent = `invalid:
  0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3:
    - key:
        derivation_path: "//polkadot"
version: 1`;
    expect(importKeysUtils.parseYamlFile(fileContent)).toBeNull();
  });

  test('should return null for missing derivation paths', () => {
    const fileContent = `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef:
  0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3:
version: 1`;
    expect(importKeysUtils.parseYamlFile(fileContent)).toBeNull();
  });

  test('should parse yaml file with regular path', () => {
    const fileContent = `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef:
  0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3:
    - key:
        derivation_path: "//path"
version: 1`;
    const parsedData = importKeysUtils.parseYamlFile(fileContent);
    expect(parsedData).toEqual({
      version: '1',
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef': {
        '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3': [
          {
            key: {
              derivationPath: '//path',
            },
          },
        ],
      },
    });
  });

  test('should parse yaml file with shards', () => {
    const fileContent = `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef:
  0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3:
    - key:
        derivation_path: "//sharded"
        sharded: 3
version: 1`;
    const parsedData = importKeysUtils.parseYamlFile(fileContent);
    expect(parsedData).toEqual({
      version: '1',
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef': {
        '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3': [
          {
            key: {
              derivationPath: '//sharded',
              sharded: '3',
            },
          },
        ],
      },
    });
  });

  test('should parse yaml file with multiple genesis and derivation paths', () => {
    const fileContent = `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef:
  0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3:
    - key:
        derivation_path: "//path1"
  0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe:
    - key:
        derivation_path: "//path2"
version: 1`;
    const parsedData = importKeysUtils.parseYamlFile(fileContent);
    expect(parsedData).toEqual({
      version: '1',
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef': {
        '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3': [
          {
            key: {
              derivationPath: '//path1',
            },
          },
        ],
        '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe': [
          {
            key: {
              derivationPath: '//path2',
            },
          },
        ],
      },
    });
  });

  test('should parse yaml file with multiple derivation paths for one genesis', () => {
    const fileContent = `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef:
  0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3:
    - key:
        derivation_path: "//path1"
    - key:
        derivation_path: "//path2"
version: 1`;
    const parsedData = importKeysUtils.parseYamlFile(fileContent);
    expect(parsedData).toEqual({
      version: '1',
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef': {
        '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3': [
          {
            key: {
              derivationPath: '//path1',
            },
          },
          {
            key: {
              derivationPath: '//path2',
            },
          },
        ],
      },
    });
  });
});
