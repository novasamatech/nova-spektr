#!/usr/bin/env node

import { ApiPromise, WsProvider } from '@polkadot/api';
import { isHex } from '@polkadot/util';

/**
 * Codec Parser for Polkadot.js
 * 
 * This script provides utilities to decode and encode extrinsic data
 * using the Polkadot.js library. It supports both unsigned and signed extrinsics.
 */

class CodecParser {
  constructor(api) {
    this.api = api;
    this.registry = api.registry;
  }

  /**
   * Decode extrinsic call data
   * @param {string} callData - Hex string of the call data
   * @returns {Object} Decoded extrinsic information
   */
  decodeCallData(callData) {
    try {
      if (!isHex(callData)) {
        throw new Error('Call data must be a valid hex string');
      }

      const extrinsicCall = this.api.createType('Call', callData);
      const { method, section } = this.api.registry.findMetaCall(extrinsicCall.callIndex);

      return {
        section,
        method,
        args: extrinsicCall.args.map(arg => ({
          value: arg.toHuman(),
          type: arg.constructor.name,
          raw: arg.toHex()
        })),
        callIndex: extrinsicCall.callIndex,
        callData: callData
      };
    } catch (error) {
      throw new Error(`Failed to decode call data: ${error.message}`);
    }
  }

  /**
   * Decode a complete extrinsic (with signature)
   * @param {string} extrinsicHex - Hex string of the complete extrinsic
   * @returns {Object} Decoded extrinsic information
   */
  decodeExtrinsic(extrinsicHex) {
    try {
      if (!isHex(extrinsicHex)) {
        throw new Error('Extrinsic must be a valid hex string');
      }

      // First try to decode as a complete extrinsic
      try {
        const extrinsic = this.api.createType('Extrinsic', extrinsicHex);
        
        return {
          version: extrinsic.version,
          isSigned: extrinsic.isSigned,
          signer: extrinsic.isSigned ? extrinsic.signer.toString() : null,
          signature: extrinsic.isSigned ? extrinsic.signature.toHex() : null,
          call: this.decodeCallData(extrinsic.method.toHex()),
          length: extrinsic.length,
          hash: extrinsic.hash.toHex()
        };
      } catch (extrinsicError) {
        // If extrinsic decoding fails, try to decode as call data
        // This handles unsigned extrinsics or call data directly
        console.warn('Failed to decode as extrinsic, trying as call data:', extrinsicError.message);
        
        const callData = this.decodeCallData(extrinsicHex);
        
        return {
          version: null,
          isSigned: false,
          signer: null,
          signature: null,
          call: callData,
          length: extrinsicHex.length / 2 - 1, // Approximate length (excluding 0x)
          hash: null,
          note: 'Decoded as call data (unsigned extrinsic)'
        };
      }
    } catch (error) {
      throw new Error(`Failed to decode extrinsic: ${error.message}`);
    }
  }

  /**
   * Encode call data from section, method and arguments
   * @param {string} section - Pallet section name
   * @param {string} method - Method name
   * @param {Array} args - Method arguments
   * @returns {string} Encoded call data as hex string
   */
  encodeCallData(section, method, args = []) {
    try {
      const extrinsicFn = this.api.tx[section]?.[method];
      if (!extrinsicFn) {
        throw new Error(`Method ${section}.${method} not found`);
      }

      const extrinsic = extrinsicFn(...args);
      return extrinsic.method.toHex();
    } catch (error) {
      throw new Error(`Failed to encode call data: ${error.message}`);
    }
  }

  /**
   * Create a signed extrinsic
   * @param {string} callData - Hex string of the call data
   * @param {Object} signer - Signer object with keypair
   * @param {Object} options - Signing options
   * @returns {Promise<Object>} Signed extrinsic
   */
  async createSignedExtrinsic(callData, signer, options = {}) {
    try {
      const { nonce = 0, tip = 0, era = { MortalEra: '0x00' } } = options;
      
      const extrinsic = this.api.tx(callData);
      
      const signedExtrinsic = await extrinsic.signAsync(signer, {
        nonce,
        tip,
        era
      });

      return {
        extrinsic: signedExtrinsic.toHex(),
        hash: signedExtrinsic.hash.toHex(),
        callData: callData,
        signature: signedExtrinsic.signature.toHex(),
        signer: signedExtrinsic.signer.toString()
      };
    } catch (error) {
      throw new Error(`Failed to create signed extrinsic: ${error.message}`);
    }
  }

  /**
   * Verify extrinsic signature
   * @param {string} extrinsicHex - Hex string of the extrinsic
   * @returns {boolean} True if signature is valid
   */
  verifySignature(extrinsicHex) {
    try {
      const extrinsic = this.api.createType('Extrinsic', extrinsicHex);
      
      if (!extrinsic.isSigned) {
        return false;
      }

      // Create the signing payload
      const signingPayload = this.api.createType('ExtrinsicPayload', {
        method: extrinsic.method,
        nonce: extrinsic.nonce,
        tip: extrinsic.tip,
        era: extrinsic.era,
        blockHash: extrinsic.blockHash
      });

      // Verify the signature
      const isValid = extrinsic.signature.verify(signingPayload.toU8a(), extrinsic.signer);
      return isValid.isValid;
    } catch (error) {
      console.error('Signature verification failed:', error.message);
      return false;
    }
  }

  /**
   * Get extrinsic hash
   * @param {string} extrinsicHex - Hex string of the extrinsic
   * @returns {string} Extrinsic hash as hex string
   */
  getExtrinsicHash(extrinsicHex) {
    try {
      const extrinsic = this.api.createType('Extrinsic', extrinsicHex);
      return extrinsic.hash.toHex();
    } catch (error) {
      throw new Error(`Failed to get extrinsic hash: ${error.message}`);
    }
  }

  /**
   * Decode an unsigned extrinsic (call data)
   * @param {string} callData - Hex string of the call data
   * @returns {Object} Decoded unsigned extrinsic information
   */
  decodeUnsignedExtrinsic(callData) {
    try {
      if (!isHex(callData)) {
        throw new Error('Call data must be a valid hex string');
      }

      const decodedCall = this.decodeCallData(callData);
      
      return {
        version: null,
        isSigned: false,
        signer: null,
        signature: null,
        call: decodedCall,
        length: callData.length / 2 - 1, // Approximate length (excluding 0x)
        hash: null,
        type: 'unsigned_extrinsic'
      };
    } catch (error) {
      throw new Error(`Failed to decode unsigned extrinsic: ${error.message}`);
    }
  }

  /**
   * Parse block for extrinsics
   * @param {string} blockHash - Block hash (optional, uses latest if not provided)
   * @returns {Promise<Array>} Array of decoded extrinsics
   */
  async parseBlockExtrinsics(blockHash = null) {
    try {
      const hash = blockHash || await this.api.rpc.chain.getFinalizedHead();
      const block = await this.api.rpc.chain.getBlock(hash);
      
      return block.block.extrinsics.map((extrinsic, index) => ({
        index,
        ...this.decodeExtrinsic(extrinsic.toHex())
      }));
    } catch (error) {
      throw new Error(`Failed to parse block extrinsics: ${error.message}`);
    }
  }
}

// Example usage and CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
Codec Parser for Polkadot.js

Usage:
  node codecParser.js <command> [options]

Commands:
  decode-call <callData>           - Decode call data
  decode-extrinsic <extrinsicHex>  - Decode complete extrinsic (signed or unsigned)
  decode-unsigned <callData>       - Decode unsigned extrinsic (call data)
  encode-call <section> <method> [args...] - Encode call data
  verify <extrinsicHex>            - Verify extrinsic signature
  hash <extrinsicHex>              - Get extrinsic hash
  parse-block [blockHash]          - Parse block extrinsics

Examples:
  node codecParser.js decode-call 0x0500ff8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48
  node codecParser.js decode-extrinsic 0x410284ff8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a4800d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d01
  node codecParser.js decode-unsigned 0x0500ff8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48
  node codecParser.js encode-call balances transfer 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 1000000000000
    `);
    return;
  }

  // Connect to a Polkadot network (you can change the endpoint)
  const provider = new WsProvider('wss://rpc-test-network-1.novasama-tech.org');
  const api = await ApiPromise.create({ provider });

  const parser = new CodecParser(api);

  try {
    switch (command) {
      case 'decode-call': {
        const callData = args[1];
        if (!callData) {
          console.error('Error: Call data is required');
          return;
        }
        const decoded = parser.decodeCallData(callData);
        console.log('Decoded Call Data:');
        console.log(JSON.stringify(decoded, null, 2));
        break;
      }

      case 'decode-extrinsic': {
        const extrinsicHex = args[1];
        if (!extrinsicHex) {
          console.error('Error: Extrinsic hex is required');
          return;
        }
        const decoded = parser.decodeExtrinsic(extrinsicHex);
        console.log('Decoded Extrinsic:');
        console.log(JSON.stringify(decoded, null, 2));
        break;
      }

      case 'decode-unsigned': {
        const callData = args[1];
        if (!callData) {
          console.error('Error: Call data is required');
          return;
        }
        const decoded = parser.decodeUnsignedExtrinsic(callData);
        console.log('Decoded Unsigned Extrinsic:');
        console.log(JSON.stringify(decoded, null, 2));
        break;
      }

      case 'encode-call': {
        const section = args[1];
        const method = args[2];
        const callArgs = args.slice(3);
        
        if (!section || !method) {
          console.error('Error: Section and method are required');
          return;
        }
        
        const encoded = parser.encodeCallData(section, method, callArgs);
        console.log('Encoded Call Data:', encoded);
        break;
      }

      case 'verify': {
        const extrinsicHex = args[1];
        if (!extrinsicHex) {
          console.error('Error: Extrinsic hex is required');
          return;
        }
        const isValid = parser.verifySignature(extrinsicHex);
        console.log('Signature Valid:', isValid);
        break;
      }

      case 'hash': {
        const extrinsicHex = args[1];
        if (!extrinsicHex) {
          console.error('Error: Extrinsic hex is required');
          return;
        }
        const hash = parser.getExtrinsicHash(extrinsicHex);
        console.log('Extrinsic Hash:', hash);
        break;
      }

      case 'parse-block': {
        const blockHash = args[1];
        const extrinsics = await parser.parseBlockExtrinsics(blockHash);
        console.log('Block Extrinsics:');
        console.log(JSON.stringify(extrinsics, null, 2));
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await api.disconnect();
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CodecParser };
