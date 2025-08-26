const fileData = `0x00: #vault public address
  0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3: #polkadot genesis hash
    - key:
        derivation_path:  "//polkadot"
        type: "main"
  0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe:
    - key:
        derivation_path: "//kusama"
        type: "main"
        name: "Main wallet account"
version: 1`;

const invalidFileStructure = `0x00: #vault public address
  0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3: #polkadot genesis hash
  0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe:
    - key:
        derivation_path: "//kusama"
        type: "main"
        name: "Main wallet account"
version: 1`;

const invalidPaths = `0x00: #vault public address
  0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3: #polkadot genesis hash
    - key:
        derivation_path:  "//polkadot///password"
        type: "main"
  0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe:
    - key:
        derivation_path: "invalid_path1"
        type: "main"
    - key:
        derivation_path: "invalid_path2"
        type: "main"
version: 1`;

export const importKeysModelMock = {
  fileData,
  invalidFileStructure,
  invalidPaths,
};
