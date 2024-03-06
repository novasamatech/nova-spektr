"use strict";
(self["webpackChunknova_spektr"] = self["webpackChunknova_spektr"] || []).push([[992],{

/***/ 46992:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  AddChainError: () => (/* reexport */ public_types/* AddChainError */.iA),
  AlreadyDestroyedError: () => (/* reexport */ public_types/* AlreadyDestroyedError */.A_),
  CrashError: () => (/* reexport */ public_types/* CrashError */.LX),
  JsonRpcDisabledError: () => (/* reexport */ public_types/* JsonRpcDisabledError */.BU),
  QueueFullError: () => (/* reexport */ public_types/* QueueFullError */.t_),
  startWithBytecode: () => (/* binding */ startWithBytecode)
});

// EXTERNAL MODULE: ./node_modules/.pnpm/smoldot@2.0.13/node_modules/smoldot/dist/mjs/public-types.js
var public_types = __webpack_require__(26127);
;// CONCATENATED MODULE: ./node_modules/.pnpm/smoldot@2.0.13/node_modules/smoldot/dist/mjs/internals/buffer.js
// Smoldot
// Copyright (C) 2019-2022  Parity Technologies (UK) Ltd.
// SPDX-License-Identifier: GPL-3.0-or-later WITH Classpath-exception-2.0
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
function utf8BytesToString(buffer, offset, length) {
    checkRange(buffer, offset, length);
    // The `TextDecoder` API is supported by all major browsers and by NodeJS.
    // <https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder>
    return new TextDecoder().decode(buffer.slice(offset, offset + length));
}
function readUInt8(buffer, offset) {
    checkRange(buffer, offset, 1);
    return buffer[offset];
}
function readUInt16BE(buffer, offset) {
    checkRange(buffer, offset, 2);
    return ((buffer[offset] << 8) | buffer[offset + 1]);
}
function readUInt32LE(buffer, offset) {
    checkRange(buffer, offset, 4);
    return (buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16)) + (buffer[offset + 3] * 0x1000000);
}
/**
 * Sets the value of a given byte in the buffer.
 *
 * This function is equivalent to `buffer[offset] = value`, except that an exception is thrown
 * if `offset` is out of range.
 */
function writeUInt8(buffer, offset, value) {
    checkRange(buffer, offset, 1);
    buffer[offset] = value & 0xff;
}
function writeUInt32LE(buffer, offset, value) {
    checkRange(buffer, offset, 4);
    buffer[offset + 3] = (value >>> 24) & 0xff;
    buffer[offset + 2] = (value >>> 16) & 0xff;
    buffer[offset + 1] = (value >>> 8) & 0xff;
    buffer[offset] = value & 0xff;
}
function writeUInt64LE(buffer, offset, value) {
    checkRange(buffer, offset, 8);
    buffer[offset + 7] = Number((value >> BigInt(56)) & BigInt(0xff));
    buffer[offset + 6] = Number((value >> BigInt(48)) & BigInt(0xff));
    buffer[offset + 5] = Number((value >> BigInt(40)) & BigInt(0xff));
    buffer[offset + 4] = Number((value >> BigInt(32)) & BigInt(0xff));
    buffer[offset + 3] = Number((value >> BigInt(24)) & BigInt(0xff));
    buffer[offset + 2] = Number((value >> BigInt(16)) & BigInt(0xff));
    buffer[offset + 1] = Number((value >> BigInt(8)) & BigInt(0xff));
    buffer[offset] = Number(value & BigInt(0xff));
}
function checkRange(buffer, offset, length) {
    if (!Number.isInteger(offset) || offset < 0)
        throw new RangeError();
    if (offset + length > buffer.length)
        throw new RangeError();
}

;// CONCATENATED MODULE: ./node_modules/.pnpm/smoldot@2.0.13/node_modules/smoldot/dist/mjs/internals/local-instance.js
// Smoldot
// Copyright (C) 2019-2022  Parity Technologies (UK) Ltd.
// SPDX-License-Identifier: GPL-3.0-or-later WITH Classpath-exception-2.0
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Starts a new instance using the given configuration.
 *
 * Even though this function doesn't do anything asynchronous, it needs to be asynchronous due to
 * the fact that `WebAssembly.instantiate` is for some reason asynchronous.
 *
 * After this function returns, the execution of CPU-heavy tasks of smoldot will happen
 * asynchronously in the background.
 *
 * This instance is low-level in the sense that invalid input can lead to crashes and that input
 * isn't sanitized. In other words, you know what you're doing.
 */
function startLocalInstance(config, wasmModule, eventCallback) {
    return __awaiter(this, void 0, void 0, function* () {
        const state = {
            instance: null,
            currentTask: null,
            bufferIndices: new Array(),
            advanceExecutionPromise: null,
            onShutdownExecutorOrWasmPanic: () => { }
        };
        const smoldotJsBindings = {
            // Must exit with an error. A human-readable message can be found in the WebAssembly
            // memory in the given buffer.
            panic: (ptr, len) => {
                const instance = state.instance;
                state.instance = null;
                ptr >>>= 0;
                len >>>= 0;
                const message = utf8BytesToString(new Uint8Array(instance.exports.memory.buffer), ptr, len);
                eventCallback({ ty: "wasm-panic", message, currentTask: state.currentTask });
                state.onShutdownExecutorOrWasmPanic();
                state.onShutdownExecutorOrWasmPanic = () => { };
                throw new Error();
            },
            random_get: (ptr, len) => {
                const instance = state.instance;
                ptr >>>= 0;
                len >>>= 0;
                const baseBuffer = new Uint8Array(instance.exports.memory.buffer)
                    .subarray(ptr, ptr + len);
                for (let iter = 0; iter < len; iter += 65536) {
                    // `baseBuffer.subarray` automatically saturates at the end of the buffer
                    config.getRandomValues(baseBuffer.subarray(iter, iter + 65536));
                }
            },
            unix_timestamp_us: () => {
                const value = Math.floor(Date.now());
                if (value < 0)
                    throw new Error("UNIX timestamp inferior to 0");
                return BigInt(value) * BigInt(1000);
            },
            monotonic_clock_us: () => {
                const nowMs = config.performanceNow();
                const nowMsInt = Math.floor(nowMs);
                const now = BigInt(nowMsInt) * BigInt(1000) +
                    BigInt(Math.floor(((nowMs - nowMsInt) * 1000)));
                return now;
            },
            buffer_size: (bufferIndex) => {
                const buf = state.bufferIndices[bufferIndex];
                return buf.byteLength;
            },
            buffer_copy: (bufferIndex, targetPtr) => {
                const instance = state.instance;
                targetPtr = targetPtr >>> 0;
                const buf = state.bufferIndices[bufferIndex];
                new Uint8Array(instance.exports.memory.buffer).set(buf, targetPtr);
            },
            advance_execution_ready: () => {
                if (state.advanceExecutionPromise)
                    state.advanceExecutionPromise();
                state.advanceExecutionPromise = null;
            },
            // Used by the Rust side to notify that a JSON-RPC response or subscription notification
            // is available in the queue of JSON-RPC responses.
            json_rpc_responses_non_empty: (chainId) => {
                eventCallback({ ty: "json-rpc-responses-non-empty", chainId });
            },
            // Used by the Rust side to emit a log entry.
            // See also the `max_log_level` parameter in the configuration.
            log: (level, targetPtr, targetLen, messagePtr, messageLen) => {
                const instance = state.instance;
                targetPtr >>>= 0;
                targetLen >>>= 0;
                messagePtr >>>= 0;
                messageLen >>>= 0;
                const mem = new Uint8Array(instance.exports.memory.buffer);
                let target = utf8BytesToString(mem, targetPtr, targetLen);
                let message = utf8BytesToString(mem, messagePtr, messageLen);
                eventCallback({ ty: "log", level, message, target });
            },
            // Must call `timer_finished` after the given number of milliseconds has elapsed.
            start_timer: (ms) => {
                const instance = state.instance;
                // In both NodeJS and browsers, if `setTimeout` is called with a value larger than
                // 2147483647, the delay is for some reason instead set to 1.
                // As mentioned in the documentation of `start_timer`, it is acceptable to end the
                // timer before the given number of milliseconds has passed.
                if (ms > 2147483647)
                    ms = 2147483647;
                // In browsers, `setTimeout` works as expected when `ms` equals 0. However, NodeJS
                // requires a minimum of 1 millisecond (if `0` is passed, it is automatically replaced
                // with `1`) and wants you to use `setImmediate` instead.
                if (ms < 1 && typeof setImmediate === "function") {
                    setImmediate(() => {
                        if (!state.instance)
                            return;
                        try {
                            instance.exports.timer_finished();
                        }
                        catch (_error) { }
                    });
                }
                else {
                    setTimeout(() => {
                        if (!state.instance)
                            return;
                        try {
                            instance.exports.timer_finished();
                        }
                        catch (_error) { }
                    }, ms);
                }
            },
            // Must indicate whether the given connection type is supported.
            connection_type_supported: (ty) => {
                // TODO: consider extracting config options so user can't change the fields dynamically
                switch (ty) {
                    case 0:
                    case 1:
                    case 2: {
                        return config.forbidTcp ? 0 : 1;
                    }
                    case 4:
                    case 5:
                    case 6: {
                        return config.forbidNonLocalWs ? 0 : 1;
                    }
                    case 7: {
                        return config.forbidWs ? 0 : 1;
                    }
                    case 14: {
                        return config.forbidWss ? 0 : 1;
                    }
                    case 16:
                    case 17: {
                        return config.forbidWebRtc ? 0 : 1;
                    }
                    default:
                        // Indicates a bug somewhere.
                        throw new Error("Invalid connection type passed to `connection_type_supported`");
                }
            },
            // Must create a new connection object. This implementation stores the created object in
            // `connections`.
            connection_new: (connectionId, addrPtr, addrLen) => {
                const instance = state.instance;
                const mem = new Uint8Array(instance.exports.memory.buffer);
                addrPtr >>>= 0;
                addrLen >>>= 0;
                let address;
                switch (readUInt8(mem, addrPtr)) {
                    case 0:
                    case 1:
                    case 2: {
                        const port = readUInt16BE(mem, addrPtr + 1);
                        const hostname = utf8BytesToString(mem, addrPtr + 3, addrLen - 3);
                        address = { ty: "tcp", port, hostname };
                        break;
                    }
                    case 4:
                    case 6: {
                        const port = readUInt16BE(mem, addrPtr + 1);
                        const hostname = utf8BytesToString(mem, addrPtr + 3, addrLen - 3);
                        address = { ty: "websocket", url: "ws://" + hostname + ":" + port };
                        break;
                    }
                    case 5: {
                        const port = readUInt16BE(mem, addrPtr + 1);
                        const hostname = utf8BytesToString(mem, addrPtr + 3, addrLen - 3);
                        address = { ty: "websocket", url: "ws://[" + hostname + "]:" + port };
                        break;
                    }
                    case 14: {
                        const port = readUInt16BE(mem, addrPtr + 1);
                        const hostname = utf8BytesToString(mem, addrPtr + 3, addrLen - 3);
                        address = { ty: "websocket", url: "wss://" + hostname + ":" + port };
                        break;
                    }
                    case 16: {
                        const targetPort = readUInt16BE(mem, addrPtr + 1);
                        const remoteTlsCertificateSha256 = mem.slice(addrPtr + 3, addrPtr + 35);
                        const targetIp = utf8BytesToString(mem, addrPtr + 35, addrLen - 35);
                        address = { ty: "webrtc", ipVersion: '4', remoteTlsCertificateSha256, targetIp, targetPort };
                        break;
                    }
                    case 17: {
                        const targetPort = readUInt16BE(mem, addrPtr + 1);
                        const remoteTlsCertificateSha256 = mem.slice(addrPtr + 3, addrPtr + 35);
                        const targetIp = utf8BytesToString(mem, addrPtr + 35, addrLen - 35);
                        address = { ty: "webrtc", ipVersion: '6', remoteTlsCertificateSha256, targetIp, targetPort };
                        break;
                    }
                    default:
                        // Indicates a bug somewhere.
                        throw new Error("Invalid encoded address passed to `connection_new`");
                }
                eventCallback({ ty: "new-connection", connectionId, address });
            },
            // Must close and destroy the connection object.
            reset_connection: (connectionId) => {
                eventCallback({ ty: "connection-reset", connectionId });
            },
            // Opens a new substream on a multi-stream connection.
            connection_stream_open: (connectionId) => {
                eventCallback({ ty: "connection-stream-open", connectionId });
            },
            // Closes a substream on a multi-stream connection.
            connection_stream_reset: (connectionId, streamId) => {
                eventCallback({ ty: "connection-stream-reset", connectionId, streamId });
            },
            // Must queue the data found in the WebAssembly memory at the given pointer. It is assumed
            // that this function is called only when the connection is in an open state.
            stream_send: (connectionId, streamId, ptr, len) => {
                const instance = state.instance;
                const mem = new Uint8Array(instance.exports.memory.buffer);
                ptr >>>= 0;
                len >>>= 0;
                const data = new Array();
                for (let i = 0; i < len; ++i) {
                    const bufPtr = readUInt32LE(mem, ptr + 8 * i);
                    const bufLen = readUInt32LE(mem, ptr + 8 * i + 4);
                    data.push(mem.slice(bufPtr, bufPtr + bufLen));
                }
                // TODO: docs says the streamId is provided only for multi-stream connections, but here it's always provided
                eventCallback({ ty: "stream-send", connectionId, streamId, data });
            },
            stream_send_close: (connectionId, streamId) => {
                // TODO: docs says the streamId is provided only for multi-stream connections, but here it's always provided
                eventCallback({ ty: "stream-send-close", connectionId, streamId });
            },
            current_task_entered: (ptr, len) => {
                ptr >>>= 0;
                len >>>= 0;
                const taskName = utf8BytesToString(new Uint8Array(state.instance.exports.memory.buffer), ptr, len);
                state.currentTask = taskName;
            },
            current_task_exit: () => {
                state.currentTask = null;
            }
        };
        // Start the Wasm virtual machine.
        // The Rust code defines a list of imports that must be fulfilled by the environment. The second
        // parameter provides their implementations.
        const result = yield WebAssembly.instantiate(wasmModule, {
            // The functions with the "smoldot" prefix are specific to smoldot.
            "smoldot": smoldotJsBindings,
        });
        state.instance = result;
        // Smoldot requires an initial call to the `init` function in order to do its internal
        // configuration.
        state.instance.exports.init(config.maxLogLevel);
        // Promise that is notified when the `shutdownExecutor` function is called or when a Wasm
        // panic happens.
        const shutdownExecutorOrWasmPanicPromise = new Promise((resolve) => state.onShutdownExecutorOrWasmPanic = () => resolve("stop"));
        (() => __awaiter(this, void 0, void 0, function* () {
            const cpuRateLimit = config.cpuRateLimit;
            // In order to avoid calling `setTimeout` too often, we accumulate sleep up until
            // a certain threshold.
            let missingSleep = 0;
            let now = config.performanceNow();
            while (true) {
                const whenReadyAgain = new Promise((resolve) => state.advanceExecutionPromise = () => resolve("ready"));
                if (!state.instance)
                    break;
                state.instance.exports.advance_execution();
                const afterExec = config.performanceNow();
                const elapsed = afterExec - now;
                now = afterExec;
                // In order to enforce the rate limiting, we stop executing for a certain
                // amount of time.
                // The base equation here is: `(sleep + elapsed) * rateLimit == elapsed`,
                // from which the calculation below is derived.
                const sleep = elapsed * (1.0 / cpuRateLimit - 1.0);
                missingSleep += sleep;
                if (missingSleep > 5) {
                    // `setTimeout` has a maximum value, after which it will overflow. 🤦
                    // See <https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#maximum_delay_value>
                    // While adding a cap technically skews the CPU rate limiting algorithm, we don't
                    // really care for such extreme values.
                    if (missingSleep > 2147483646) // Doc says `> 2147483647`, but I don't really trust their pedanticism so let's be safe
                        missingSleep = 2147483646;
                    const sleepFinished = new Promise((resolve) => setTimeout(() => resolve("timeout"), missingSleep));
                    if ((yield Promise.race([sleepFinished, shutdownExecutorOrWasmPanicPromise])) === "stop")
                        break;
                }
                if ((yield Promise.race([whenReadyAgain, shutdownExecutorOrWasmPanicPromise])) === "stop")
                    break;
                const afterWait = config.performanceNow();
                // `afterWait - now` is equal to how long we've waited for the `setTimeout` callback to
                // trigger. While in principle `afterWait - now` should be roughly equal to
                // `missingSleep`, in reality `setTimeout` can take much longer than the parameter
                // provided. See <https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#timeouts_in_inactive_tabs>.
                // For this reason, `missingSleep` can become negative here. This is intended.
                // However, we don't want to accumulate too much sleep. There should be a maximum
                // amount of time during which the CPU executes without yielding. For this reason, we
                // add a minimum bound for `missingSleep`.
                missingSleep -= (afterWait - now);
                if (missingSleep < -10000)
                    missingSleep = -10000;
                now = afterWait;
            }
            if (!state.instance)
                return;
            eventCallback({ ty: "executor-shutdown" });
        }))();
        return {
            request: (request, chainId) => {
                if (!state.instance)
                    return 1; // TODO: return a different error code? should be documented
                state.bufferIndices[0] = new TextEncoder().encode(request);
                return state.instance.exports.json_rpc_send(0, chainId) >>> 0;
            },
            peekJsonRpcResponse: (chainId) => {
                if (!state.instance)
                    return null;
                const mem = new Uint8Array(state.instance.exports.memory.buffer);
                const responseInfo = state.instance.exports.json_rpc_responses_peek(chainId) >>> 0;
                const ptr = readUInt32LE(mem, responseInfo) >>> 0;
                const len = readUInt32LE(mem, responseInfo + 4) >>> 0;
                // `len === 0` means "queue is empty" according to the API.
                // In that situation, queue the resolve/reject.
                if (len !== 0) {
                    const message = utf8BytesToString(mem, ptr, len);
                    state.instance.exports.json_rpc_responses_pop(chainId);
                    return message;
                }
                else {
                    return null;
                }
            },
            addChain: (chainSpec, databaseContent, potentialRelayChains, disableJsonRpc, jsonRpcMaxPendingRequests, jsonRpcMaxSubscriptions) => {
                if (!state.instance) {
                    eventCallback({ ty: "add-chain-result", success: false, error: "Smoldot has crashed" });
                    return;
                }
                // The caller is supposed to avoid this situation.
                console.assert(disableJsonRpc || jsonRpcMaxPendingRequests != 0, "invalid jsonRpcMaxPendingRequests value passed to local-instance::addChain");
                // `add_chain` unconditionally allocates a chain id. If an error occurs, however, this chain
                // id will refer to an *erroneous* chain. `chain_is_ok` is used below to determine whether it
                // has succeeeded or not.
                state.bufferIndices[0] = new TextEncoder().encode(chainSpec);
                state.bufferIndices[1] = new TextEncoder().encode(databaseContent);
                const potentialRelayChainsEncoded = new Uint8Array(potentialRelayChains.length * 4);
                for (let idx = 0; idx < potentialRelayChains.length; ++idx) {
                    writeUInt32LE(potentialRelayChainsEncoded, idx * 4, potentialRelayChains[idx]);
                }
                state.bufferIndices[2] = potentialRelayChainsEncoded;
                const chainId = state.instance.exports.add_chain(0, 1, disableJsonRpc ? 0 : jsonRpcMaxPendingRequests, jsonRpcMaxSubscriptions, 2);
                delete state.bufferIndices[0];
                delete state.bufferIndices[1];
                delete state.bufferIndices[2];
                if (state.instance.exports.chain_is_ok(chainId) != 0) {
                    eventCallback({ ty: "add-chain-result", success: true, chainId });
                }
                else {
                    const errorMsgLen = state.instance.exports.chain_error_len(chainId) >>> 0;
                    const errorMsgPtr = state.instance.exports.chain_error_ptr(chainId) >>> 0;
                    const errorMsg = utf8BytesToString(new Uint8Array(state.instance.exports.memory.buffer), errorMsgPtr, errorMsgLen);
                    state.instance.exports.remove_chain(chainId);
                    eventCallback({ ty: "add-chain-result", success: false, error: errorMsg });
                }
            },
            removeChain: (chainId) => {
                if (!state.instance)
                    return;
                state.instance.exports.remove_chain(chainId);
            },
            shutdownExecutor: () => {
                if (!state.instance)
                    return;
                const cb = state.onShutdownExecutorOrWasmPanic;
                state.onShutdownExecutorOrWasmPanic = () => { };
                cb();
            },
            connectionMultiStreamSetHandshakeInfo: (connectionId, info) => {
                if (!state.instance)
                    return;
                const handshakeTy = new Uint8Array(1 + info.localTlsCertificateSha256.length);
                writeUInt8(handshakeTy, 0, 0);
                handshakeTy.set(info.localTlsCertificateSha256, 1);
                state.bufferIndices[0] = handshakeTy;
                state.instance.exports.connection_multi_stream_set_handshake_info(connectionId, 0);
                delete state.bufferIndices[0];
            },
            connectionReset: (connectionId, message) => {
                if (!state.instance)
                    return;
                state.bufferIndices[0] = new TextEncoder().encode(message);
                state.instance.exports.connection_reset(connectionId, 0);
                delete state.bufferIndices[0];
            },
            streamWritableBytes: (connectionId, numExtra, streamId) => {
                if (!state.instance)
                    return;
                state.instance.exports.stream_writable_bytes(connectionId, streamId || 0, numExtra);
            },
            streamMessage: (connectionId, message, streamId) => {
                if (!state.instance)
                    return;
                state.bufferIndices[0] = message;
                state.instance.exports.stream_message(connectionId, streamId || 0, 0);
                delete state.bufferIndices[0];
            },
            streamOpened: (connectionId, streamId, direction) => {
                if (!state.instance)
                    return;
                state.instance.exports.connection_stream_opened(connectionId, streamId, direction === 'outbound' ? 1 : 0);
            },
            streamReset: (connectionId, streamId, message) => {
                if (!state.instance)
                    return;
                state.bufferIndices[0] = new TextEncoder().encode(message);
                state.instance.exports.stream_reset(connectionId, streamId, 0);
                delete state.bufferIndices[0];
            },
        };
    });
}

;// CONCATENATED MODULE: ./node_modules/.pnpm/smoldot@2.0.13/node_modules/smoldot/dist/mjs/internals/remote-instance.js
// Smoldot
// Copyright (C) 2023  Pierre Krieger
// SPDX-License-Identifier: GPL-3.0-or-later WITH Classpath-exception-2.0
var remote_instance_awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
// Contains an implementation of `Instance` that is remote.
//
// In terms of implementation, the logic is pretty straight forward, with two exceptions:
//
// - Connections are tracked on both sides in order to handle situations where one side has
//   reset a connection or stream but the other is sending messages about this connection/stream.
//
// - JSON-RPC requests aren't sent back lazily one at a time. Instead, the client indicates that it
//   is ready to accept more JSON-RPC responses, after which the server can send responses at any
//   time and the client queues them locally.

// Implementation note: it is unclear even in the official specification
// (https://html.spec.whatwg.org/multipage/web-messaging.html) whether both sides of a
// `MessagePort` should be closed, or if one is enough.
//
// It has been noticed that doing `port.postMessage(...); port.close();` doesn't deliver the
// message on Firefox (but it does on Chrome). The code below takes note of this, and only closes
// a port upon *receiving* the last possible message. It therefore assumes that closing only one
// side is enough. It is unclear whether this causes any memory leak.
function connectToInstanceServer(config) {
    return remote_instance_awaiter(this, void 0, void 0, function* () {
        // Send the wasm module and configuration to the server.
        // Note that we await the `wasmModule` `Promise` here.
        // If instead we used `wasmModule.then(...)`, the user would be able to start using the
        // returned instance before the module has been sent to the server.
        // In order to simplify the implementation, we create new ports and send one of them to
        // the server. This is necessary so that the server can pause receiving messages while the
        // instance is being initialized.
        const { port1: portToServer, port2: serverToClient } = new MessageChannel();
        const initialPort = config.portToServer;
        const initialMessage = {
            wasmModule: yield config.wasmModule,
            serverToClient,
            maxLogLevel: config.maxLogLevel,
            cpuRateLimit: config.cpuRateLimit,
            forbidWs: config.forbidWs,
            forbidWss: config.forbidWss,
            forbidNonLocalWs: config.forbidNonLocalWs,
            forbidTcp: config.forbidTcp,
            forbidWebRtc: config.forbidWebRtc
        };
        initialPort.postMessage(initialMessage, [serverToClient]);
        // Note that closing `initialPort` here will lead to the message not being delivered on Firefox
        // for some reason. It is therefore closed only on shutdown.
        const state = {
            jsonRpcResponses: new Map(),
            connections: new Map(),
        };
        portToServer.onmessage = (messageEvent) => {
            const message = messageEvent.data;
            // Update some local state.
            switch (message.ty) {
                case "wasm-panic":
                case "executor-shutdown": {
                    portToServer.close();
                    initialPort.close();
                    break;
                }
                case "add-chain-result": {
                    if (message.success) {
                        state.jsonRpcResponses.set(message.chainId, new Array);
                        const moreAccepted = { ty: "accept-more-json-rpc-answers", chainId: message.chainId };
                        for (let i = 0; i < 10; ++i)
                            portToServer.postMessage(moreAccepted);
                    }
                    break;
                }
                case "new-connection": {
                    state.connections.set(message.connectionId, new Set());
                    break;
                }
                case "connection-reset": {
                    // The connection might have been reset locally in the past.
                    if (!state.connections.has(message.connectionId))
                        return;
                    state.connections.delete(message.connectionId);
                    break;
                }
                case "connection-stream-open": {
                    // The connection might have been reset locally in the past.
                    if (!state.connections.has(message.connectionId))
                        return;
                    break;
                }
                case "connection-stream-reset": {
                    // The connection might have been reset locally in the past.
                    if (!state.connections.has(message.connectionId))
                        return;
                    // The stream might have been reset locally in the past.
                    if (!state.connections.get(message.connectionId).has(message.streamId))
                        return;
                    break;
                }
                case "stream-send": {
                    // The connection might have been reset locally in the past.
                    if (!state.connections.has(message.connectionId))
                        return;
                    // The stream might have been reset locally in the past.
                    if (message.streamId && !state.connections.get(message.connectionId).has(message.streamId))
                        return;
                    break;
                }
                case "stream-send-close": {
                    // The connection might have been reset locally in the past.
                    if (!state.connections.has(message.connectionId))
                        return;
                    // The stream might have been reset locally in the past.
                    if (message.streamId && !state.connections.get(message.connectionId).has(message.streamId))
                        return;
                    break;
                }
                case "json-rpc-response": {
                    const queue = state.jsonRpcResponses.get(message.chainId);
                    // The chain might have been removed locally in the past.
                    if (queue)
                        queue.push(message.response);
                    config.eventCallback({ ty: "json-rpc-responses-non-empty", chainId: message.chainId });
                    return;
                }
            }
            config.eventCallback(message);
        };
        return {
            addChain(chainSpec, databaseContent, potentialRelayChains, disableJsonRpc, jsonRpcMaxPendingRequests, jsonRpcMaxSubscriptions) {
                return remote_instance_awaiter(this, void 0, void 0, function* () {
                    const msg = { ty: "add-chain", chainSpec, databaseContent, potentialRelayChains, disableJsonRpc, jsonRpcMaxPendingRequests, jsonRpcMaxSubscriptions };
                    portToServer.postMessage(msg);
                });
            },
            removeChain(chainId) {
                state.jsonRpcResponses.delete(chainId);
                const msg = { ty: "remove-chain", chainId };
                portToServer.postMessage(msg);
            },
            request(request, chainId) {
                const msg = { ty: "request", chainId, request };
                portToServer.postMessage(msg);
                return 0; // TODO: wrong return value
            },
            peekJsonRpcResponse(chainId) {
                const item = state.jsonRpcResponses.get(chainId).shift();
                if (!item)
                    return null;
                const msg = { ty: "accept-more-json-rpc-answers", chainId };
                portToServer.postMessage(msg);
                return item;
            },
            shutdownExecutor() {
                const msg = { ty: "shutdown" };
                portToServer.postMessage(msg);
            },
            connectionReset(connectionId, message) {
                state.connections.delete(connectionId);
                const msg = { ty: "connection-reset", connectionId, message };
                portToServer.postMessage(msg);
            },
            connectionMultiStreamSetHandshakeInfo(connectionId, info) {
                const msg = { ty: "connection-multistream-set-info", connectionId, info };
                portToServer.postMessage(msg);
            },
            streamMessage(connectionId, message, streamId) {
                const msg = { ty: "stream-message", connectionId, message, streamId };
                portToServer.postMessage(msg);
            },
            streamOpened(connectionId, streamId, direction) {
                state.connections.get(connectionId).add(streamId);
                const msg = { ty: "stream-opened", connectionId, streamId, direction };
                portToServer.postMessage(msg);
            },
            streamWritableBytes(connectionId, numExtra, streamId) {
                const msg = { ty: "stream-writable-bytes", connectionId, numExtra, streamId };
                portToServer.postMessage(msg);
            },
            streamReset(connectionId, streamId, message) {
                state.connections.get(connectionId).delete(streamId);
                const msg = { ty: "stream-reset", connectionId, streamId, message };
                portToServer.postMessage(msg);
            },
        };
    });
}
/**
 * Returns a `Promise` that resolves when the instance shuts down. Since the function is also
 * an asynchronous function, the actual return type is `Promise<Promise<void>>`. That is, the
 * outer `Promise` yields once the instance starts, and the inner `Promise` yields once the
 * instance shuts down.
 */
function startInstanceServer(config, initPortToClient) {
    return remote_instance_awaiter(this, void 0, void 0, function* () {
        const { serverToClient: portToClient, wasmModule, maxLogLevel, cpuRateLimit, forbidTcp, forbidWs, forbidWss, forbidNonLocalWs, forbidWebRtc } = yield new Promise((resolve) => {
            initPortToClient.onmessage = (event) => resolve(event.data);
        });
        initPortToClient.close();
        const state = {
            instance: null,
            connections: new Map(),
            acceptedJsonRpcResponses: new Map(),
        };
        const eventsCallback = (event) => {
            switch (event.ty) {
                case "add-chain-result": {
                    if (event.success) {
                        state.acceptedJsonRpcResponses.set(event.chainId, 0);
                    }
                    break;
                }
                case "executor-shutdown":
                case "wasm-panic": {
                    if (state.onExecutorShutdownOrWasmPanic) {
                        const cb = state.onExecutorShutdownOrWasmPanic;
                        delete state.onExecutorShutdownOrWasmPanic;
                        cb();
                    }
                    break;
                }
                case "json-rpc-responses-non-empty": {
                    // Process this event asynchronously because we can't call into `instance`
                    // from within the events callback itself.
                    // TODO: do better than setTimeout?
                    setTimeout(() => {
                        const numAccepted = state.acceptedJsonRpcResponses.get(event.chainId);
                        if (numAccepted === undefined || numAccepted === 0)
                            return;
                        const response = state.instance.peekJsonRpcResponse(event.chainId);
                        if (response) {
                            state.acceptedJsonRpcResponses.set(event.chainId, numAccepted - 1);
                            const msg = { ty: "json-rpc-response", chainId: event.chainId, response };
                            portToClient.postMessage(msg);
                        }
                    }, 0);
                    return;
                }
                case "new-connection": {
                    state.connections.set(event.connectionId, new Set());
                    break;
                }
                case "connection-reset": {
                    state.connections.delete(event.connectionId);
                    break;
                }
                case "connection-stream-reset": {
                    state.connections.get(event.connectionId).delete(event.streamId);
                    break;
                }
            }
            const ev = event;
            portToClient.postMessage(ev);
        };
        // We create the `Promise` ahead of time in order to potentially catch potential `wasm-panic`
        // events as early as during initialization.
        const execFinishedPromise = new Promise((resolve) => state.onExecutorShutdownOrWasmPanic = resolve);
        state.instance = yield instance.startLocalInstance(Object.assign({ forbidTcp,
            forbidWs,
            forbidNonLocalWs,
            forbidWss,
            forbidWebRtc,
            cpuRateLimit,
            maxLogLevel }, config), wasmModule, eventsCallback);
        portToClient.onmessage = (messageEvent) => {
            const message = messageEvent.data;
            switch (message.ty) {
                case "add-chain": {
                    state.instance.addChain(message.chainSpec, message.databaseContent, message.potentialRelayChains, message.disableJsonRpc, message.jsonRpcMaxPendingRequests, message.jsonRpcMaxSubscriptions);
                    break;
                }
                case "remove-chain": {
                    state.acceptedJsonRpcResponses.delete(message.chainId);
                    state.instance.removeChain(message.chainId);
                    break;
                }
                case "request": {
                    state.instance.request(message.request, message.chainId); // TODO: return value unused
                    break;
                }
                case "accept-more-json-rpc-answers": {
                    const response = state.instance.peekJsonRpcResponse(message.chainId);
                    if (response) {
                        const msg = { ty: "json-rpc-response", chainId: message.chainId, response };
                        portToClient.postMessage(msg);
                    }
                    else {
                        const numAccepted = state.acceptedJsonRpcResponses.get(message.chainId);
                        state.acceptedJsonRpcResponses.set(message.chainId, numAccepted + 1);
                    }
                    break;
                }
                case "shutdown": {
                    state.instance.shutdownExecutor();
                    break;
                }
                case "connection-reset": {
                    // The connection might have been reset locally in the past.
                    if (!state.connections.has(message.connectionId))
                        return;
                    state.instance.connectionReset(message.connectionId, message.message);
                    break;
                }
                case "connection-multistream-set-info": {
                    // The connection might have been reset locally in the past.
                    if (!state.connections.has(message.connectionId))
                        return;
                    state.instance.connectionMultiStreamSetHandshakeInfo(message.connectionId, message.info);
                    break;
                }
                case "stream-message": {
                    // The connection might have been reset locally in the past.
                    if (!state.connections.has(message.connectionId))
                        return;
                    // The stream might have been reset locally in the past.
                    if (message.streamId !== undefined && !state.connections.get(message.connectionId).has(message.streamId))
                        return;
                    state.instance.streamMessage(message.connectionId, message.message, message.streamId);
                    break;
                }
                case "stream-opened": {
                    // The connection might have been reset locally in the past.
                    if (!state.connections.has(message.connectionId))
                        return;
                    state.connections.get(message.connectionId).add(message.streamId);
                    state.instance.streamOpened(message.connectionId, message.streamId, message.direction);
                    break;
                }
                case "stream-writable-bytes": {
                    // The connection might have been reset locally in the past.
                    if (!state.connections.has(message.connectionId))
                        return;
                    // The stream might have been reset locally in the past.
                    if (message.streamId !== undefined && !state.connections.get(message.connectionId).has(message.streamId))
                        return;
                    state.instance.streamWritableBytes(message.connectionId, message.numExtra, message.streamId);
                    break;
                }
                case "stream-reset": {
                    // The connection might have been reset locally in the past.
                    if (!state.connections.has(message.connectionId))
                        return;
                    // The stream might have been reset locally in the past.
                    if (!state.connections.get(message.connectionId).has(message.streamId))
                        return;
                    state.connections.get(message.connectionId).delete(message.streamId);
                    state.instance.streamReset(message.connectionId, message.streamId, message.message);
                    break;
                }
            }
        };
        return execFinishedPromise;
    });
}

;// CONCATENATED MODULE: ./node_modules/.pnpm/smoldot@2.0.13/node_modules/smoldot/dist/mjs/internals/client.js
// Smoldot
// Copyright (C) 2019-2022  Parity Technologies (UK) Ltd.
// SPDX-License-Identifier: GPL-3.0-or-later WITH Classpath-exception-2.0
var client_awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.



// This function is similar to the `start` function found in `index.ts`, except with an extra
// parameter containing the platform-specific bindings.
// Contrary to the one within `index.js`, this function is not supposed to be directly used.
function start(options, wasmModule, platformBindings) {
    const logCallback = options.logCallback || ((level, target, message) => {
        // The first parameter of the methods of `console` has some printf-like substitution
        // capabilities. We don't really need to use this, but not using it means that the logs might
        // not get printed correctly if they contain `%`.
        if (level <= 1) {
            console.error("[%s] %s", target, message);
        }
        else if (level == 2) {
            console.warn("[%s] %s", target, message);
        }
        else if (level == 3) {
            console.info("[%s] %s", target, message);
        }
        else if (level == 4) {
            console.debug("[%s] %s", target, message);
        }
        else {
            console.trace("[%s] %s", target, message);
        }
    });
    if (!(wasmModule instanceof Promise)) {
        wasmModule = Promise.resolve(wasmModule);
    }
    // Extract (to make sure the value doesn't change) and sanitize `cpuRateLimit`.
    let cpuRateLimit = options.cpuRateLimit || 1.0;
    if (isNaN(cpuRateLimit))
        cpuRateLimit = 1.0;
    if (cpuRateLimit > 1.0)
        cpuRateLimit = 1.0;
    if (cpuRateLimit < 0.0)
        cpuRateLimit = 0.0;
    // This object holds the state of everything.
    const state = {
        instance: { status: "not-created" },
        chainIds: new WeakMap(),
        connections: new Map(),
        addChainResults: [],
        onExecutorShutdownOrWasmPanic: () => { },
        chains: new Map(),
    };
    // Callback called during the execution of the instance.
    const eventCallback = (event) => {
        switch (event.ty) {
            case "wasm-panic": {
                console.error("Smoldot has panicked" +
                    (event.currentTask ? (" while executing task `" + event.currentTask + "`") : "") +
                    ". This is a bug in smoldot. Please open an issue at " +
                    "https://github.com/smol-dot/smoldot/issues with the following message:\n" +
                    event.message);
                state.instance = {
                    status: "destroyed",
                    error: new public_types/* CrashError */.LX(event.message),
                };
                state.connections.forEach((connec) => connec.reset());
                state.connections.clear();
                for (const addChainResult of state.addChainResults) {
                    addChainResult({ success: false, error: "Smoldot has crashed" });
                }
                state.addChainResults = [];
                for (const chain of Array.from(state.chains.values())) {
                    for (const callback of chain.jsonRpcResponsesPromises) {
                        callback();
                    }
                    chain.jsonRpcResponsesPromises = [];
                }
                state.chains.clear();
                const cb = state.onExecutorShutdownOrWasmPanic;
                state.onExecutorShutdownOrWasmPanic = () => { };
                cb();
                break;
            }
            case "executor-shutdown": {
                const cb = state.onExecutorShutdownOrWasmPanic;
                state.onExecutorShutdownOrWasmPanic = () => { };
                cb();
                break;
            }
            case "log": {
                logCallback(event.level, event.target, event.message);
                break;
            }
            case "add-chain-result": {
                (state.addChainResults.shift())(event);
                break;
            }
            case "json-rpc-responses-non-empty": {
                // Notify every single promise found in `jsonRpcResponsesPromises`.
                const callbacks = state.chains.get(event.chainId).jsonRpcResponsesPromises;
                while (callbacks.length !== 0) {
                    (callbacks.shift())();
                }
                break;
            }
            case "new-connection": {
                const connectionId = event.connectionId;
                state.connections.set(connectionId, platformBindings.connect({
                    address: event.address,
                    onConnectionReset(message) {
                        if (state.instance.status !== "ready")
                            throw new Error();
                        state.connections.delete(connectionId);
                        state.instance.instance.connectionReset(connectionId, message);
                    },
                    onMessage(message, streamId) {
                        if (state.instance.status !== "ready")
                            throw new Error();
                        state.instance.instance.streamMessage(connectionId, message, streamId);
                    },
                    onStreamOpened(streamId, direction) {
                        if (state.instance.status !== "ready")
                            throw new Error();
                        state.instance.instance.streamOpened(connectionId, streamId, direction);
                    },
                    onMultistreamHandshakeInfo(info) {
                        if (state.instance.status !== "ready")
                            throw new Error();
                        state.instance.instance.connectionMultiStreamSetHandshakeInfo(connectionId, info);
                    },
                    onWritableBytes(numExtra, streamId) {
                        if (state.instance.status !== "ready")
                            throw new Error();
                        state.instance.instance.streamWritableBytes(connectionId, numExtra, streamId);
                    },
                    onStreamReset(streamId, message) {
                        if (state.instance.status !== "ready")
                            throw new Error();
                        state.instance.instance.streamReset(connectionId, streamId, message);
                    },
                }));
                break;
            }
            case "connection-reset": {
                const connection = state.connections.get(event.connectionId);
                connection.reset();
                state.connections.delete(event.connectionId);
                break;
            }
            case "connection-stream-open": {
                const connection = state.connections.get(event.connectionId);
                connection.openOutSubstream();
                break;
            }
            case "connection-stream-reset": {
                const connection = state.connections.get(event.connectionId);
                connection.reset(event.streamId);
                break;
            }
            case "stream-send": {
                const connection = state.connections.get(event.connectionId);
                connection.send(event.data, event.streamId);
                break;
            }
            case "stream-send-close": {
                const connection = state.connections.get(event.connectionId);
                connection.closeSend(event.streamId);
                break;
            }
        }
    };
    const portToWorker = options.portToWorker;
    if (!portToWorker) {
        // Start a local instance.
        state.instance = {
            status: "not-ready",
            whenReady: wasmModule
                .then((wasmModule) => {
                return startLocalInstance({
                    forbidTcp: options.forbidTcp || false,
                    forbidWs: options.forbidWs || false,
                    forbidNonLocalWs: options.forbidNonLocalWs || false,
                    forbidWss: options.forbidWss || false,
                    forbidWebRtc: options.forbidWebRtc || false,
                    maxLogLevel: options.maxLogLevel || 3,
                    cpuRateLimit,
                    envVars: [],
                    performanceNow: platformBindings.performanceNow,
                    getRandomValues: platformBindings.getRandomValues,
                }, wasmModule.wasm, eventCallback);
            })
                .then((instance) => {
                // The Wasm instance might have been crashed before this callback is called.
                if (state.instance.status === "destroyed")
                    return;
                state.instance = {
                    status: "ready",
                    instance,
                };
            })
        };
    }
    else {
        // Connect to the remote instance.
        state.instance = {
            status: "not-ready",
            whenReady: connectToInstanceServer({
                wasmModule: wasmModule.then((b) => b.wasm),
                forbidTcp: options.forbidTcp || false,
                forbidWs: options.forbidWs || false,
                forbidNonLocalWs: options.forbidNonLocalWs || false,
                forbidWss: options.forbidWss || false,
                forbidWebRtc: options.forbidWebRtc || false,
                maxLogLevel: options.maxLogLevel || 3,
                cpuRateLimit,
                portToServer: portToWorker,
                eventCallback
            }).then((instance) => {
                // The Wasm instance might have been crashed before this callback is called.
                if (state.instance.status === "destroyed")
                    return;
                state.instance = {
                    status: "ready",
                    instance,
                };
            })
        };
    }
    return {
        addChain: (options) => client_awaiter(this, void 0, void 0, function* () {
            if (state.instance.status === "not-ready")
                yield state.instance.whenReady;
            if (state.instance.status === "destroyed")
                throw state.instance.error;
            if (state.instance.status === "not-created" || state.instance.status === "not-ready")
                throw new Error(); // Internal error, not supposed to ever happen.
            // Passing a JSON object for the chain spec is an easy mistake, so we provide a more
            // readable error.
            if (!(typeof options.chainSpec === 'string'))
                throw new Error("Chain specification must be a string");
            let potentialRelayChainsIds = [];
            if (!!options.potentialRelayChains) {
                for (const chain of options.potentialRelayChains) {
                    // The content of `options.potentialRelayChains` are supposed to be chains earlier
                    // returned by `addChain`.
                    const id = state.chainIds.get(chain);
                    if (id === undefined) // It is possible for `id` to be missing if it has earlier been removed.
                        continue;
                    potentialRelayChainsIds.push(id);
                }
            }
            // Sanitize `jsonRpcMaxPendingRequests`.
            let jsonRpcMaxPendingRequests = options.jsonRpcMaxPendingRequests === undefined ? Infinity : options.jsonRpcMaxPendingRequests;
            jsonRpcMaxPendingRequests = Math.floor(jsonRpcMaxPendingRequests);
            if (jsonRpcMaxPendingRequests <= 0 || isNaN(jsonRpcMaxPendingRequests)) {
                throw new public_types/* AddChainError */.iA("Invalid value for `jsonRpcMaxPendingRequests`");
            }
            if (jsonRpcMaxPendingRequests > 0xffffffff) {
                jsonRpcMaxPendingRequests = 0xffffffff;
            }
            // Sanitize `jsonRpcMaxSubscriptions`.
            let jsonRpcMaxSubscriptions = options.jsonRpcMaxSubscriptions === undefined ? Infinity : options.jsonRpcMaxSubscriptions;
            jsonRpcMaxSubscriptions = Math.floor(jsonRpcMaxSubscriptions);
            if (jsonRpcMaxSubscriptions < 0 || isNaN(jsonRpcMaxSubscriptions)) {
                throw new public_types/* AddChainError */.iA("Invalid value for `jsonRpcMaxSubscriptions`");
            }
            if (jsonRpcMaxSubscriptions > 0xffffffff) {
                jsonRpcMaxSubscriptions = 0xffffffff;
            }
            // Sanitize `databaseContent`.
            if (options.databaseContent !== undefined && typeof options.databaseContent !== 'string')
                throw new public_types/* AddChainError */.iA("`databaseContent` is not a string");
            const promise = new Promise((resolve) => state.addChainResults.push(resolve));
            state.instance.instance.addChain(options.chainSpec, options.databaseContent || "", potentialRelayChainsIds, !!options.disableJsonRpc, jsonRpcMaxPendingRequests, jsonRpcMaxSubscriptions);
            const outcome = yield promise;
            if (!outcome.success)
                throw new public_types/* AddChainError */.iA(outcome.error);
            const chainId = outcome.chainId;
            state.chains.set(chainId, {
                jsonRpcResponsesPromises: new Array()
            });
            const newChain = {
                sendJsonRpc: (request) => {
                    if (state.instance.status === "destroyed")
                        throw state.instance.error;
                    if (state.instance.status !== "ready")
                        throw new Error(); // Internal error. Never supposed to happen.
                    if (!state.chains.has(chainId))
                        throw new public_types/* AlreadyDestroyedError */.A_();
                    if (options.disableJsonRpc)
                        throw new public_types/* JsonRpcDisabledError */.BU();
                    const retVal = state.instance.instance.request(request, chainId);
                    switch (retVal) {
                        case 0: break;
                        case 1: throw new public_types/* QueueFullError */.t_();
                        default: throw new Error("Internal error: unknown json_rpc_send error code: " + retVal);
                    }
                },
                nextJsonRpcResponse: () => client_awaiter(this, void 0, void 0, function* () {
                    while (true) {
                        if (!state.chains.has(chainId))
                            throw new public_types/* AlreadyDestroyedError */.A_();
                        if (options.disableJsonRpc)
                            return Promise.reject(new public_types/* JsonRpcDisabledError */.BU());
                        if (state.instance.status === "destroyed")
                            throw state.instance.error;
                        if (state.instance.status !== "ready")
                            throw new Error(); // Internal error. Never supposed to happen.
                        // Try to pop a message from the queue.
                        const message = state.instance.instance.peekJsonRpcResponse(chainId);
                        if (message)
                            return message;
                        // If no message is available, wait for one to be.
                        yield new Promise((resolve) => {
                            state.chains.get(chainId).jsonRpcResponsesPromises.push(resolve);
                        });
                    }
                }),
                remove: () => {
                    if (state.instance.status === "destroyed")
                        throw state.instance.error;
                    if (state.instance.status !== "ready")
                        throw new Error(); // Internal error. Never supposed to happen.
                    if (!state.chains.has(chainId))
                        throw new public_types/* AlreadyDestroyedError */.A_();
                    console.assert(state.chainIds.has(newChain));
                    state.chainIds.delete(newChain);
                    for (const callback of state.chains.get(chainId).jsonRpcResponsesPromises) {
                        callback();
                    }
                    state.chains.delete(chainId);
                    state.instance.instance.removeChain(chainId);
                },
            };
            state.chainIds.set(newChain, chainId);
            return newChain;
        }),
        terminate: () => client_awaiter(this, void 0, void 0, function* () {
            if (state.instance.status === "not-ready")
                yield state.instance.whenReady;
            if (state.instance.status === "destroyed")
                throw state.instance.error;
            if (state.instance.status !== "ready")
                throw new Error(); // Internal error. Never supposed to happen.
            state.instance.instance.shutdownExecutor();
            // Wait for the `executor-shutdown` event to be generated.
            yield new Promise((resolve) => state.onExecutorShutdownOrWasmPanic = resolve);
            // In case the instance crashes while we were waiting, we don't want to overwrite
            // the error.
            if (state.instance.status === "ready")
                state.instance = { status: "destroyed", error: new public_types/* AlreadyDestroyedError */.A_() };
            state.connections.forEach((connec) => connec.reset());
            state.connections.clear();
            for (const addChainResult of state.addChainResults) {
                addChainResult({ success: false, error: "Client.terminate() has been called" });
            }
            state.addChainResults = [];
            for (const chain of Array.from(state.chains.values())) {
                for (const callback of chain.jsonRpcResponsesPromises) {
                    callback();
                }
                chain.jsonRpcResponsesPromises = [];
            }
            state.chains.clear();
        })
    };
}

;// CONCATENATED MODULE: ./node_modules/.pnpm/smoldot@2.0.13/node_modules/smoldot/dist/mjs/no-auto-bytecode-browser.js
// Smoldot
// Copyright (C) 2019-2022  Parity Technologies (UK) Ltd.
// SPDX-License-Identifier: GPL-3.0-or-later WITH Classpath-exception-2.0
var no_auto_bytecode_browser_awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};


/**
 * Initializes a new client. This is a pre-requisite to connecting to a blockchain.
 *
 * Can never fail.
 *
 * @param options Configuration of the client.
 */
function startWithBytecode(options) {
    options.forbidTcp = true;
    // When in a secure context, browsers refuse to open non-secure WebSocket connections to
    // non-localhost. There is an exception if the page is localhost, in which case all connections
    // are allowed.
    // Detecting this ahead of time is better for the overall health of the client, as it will
    // avoid storing in memory addresses that it knows it can't connect to.
    // The condition below is a hint, and false-positives or false-negatives are not fundamentally
    // an issue.
    if ((typeof isSecureContext === 'boolean' && isSecureContext) && typeof location !== undefined) {
        const loc = location.toString();
        if (loc.indexOf('localhost') !== -1 && loc.indexOf('127.0.0.1') !== -1 && loc.indexOf('::1') !== -1) {
            options.forbidNonLocalWs = true;
        }
    }
    return start(options, options.bytecode, {
        performanceNow: () => {
            return performance.now();
        },
        getRandomValues: (buffer) => {
            const crypto = globalThis.crypto;
            if (!crypto)
                throw new Error('randomness not available');
            // Browsers have this completely undocumented behavior (it's not even part of a spec)
            // that for some reason `getRandomValues` can't be called on arrayviews back by
            // `SharedArrayBuffer`s and they throw an exception if you try.
            if (buffer.buffer instanceof ArrayBuffer)
                crypto.getRandomValues(buffer);
            else {
                const tmpArray = new Uint8Array(buffer.length);
                crypto.getRandomValues(tmpArray);
                buffer.set(tmpArray);
            }
        },
        connect: (config) => {
            return connect(config);
        }
    });
}
/**
 * Tries to open a new connection using the given configuration.
 *
 * @see Connection
 * @throws any If the multiaddress couldn't be parsed or contains an invalid protocol.
 */
function connect(config) {
    if (config.address.ty === "websocket") {
        // Even though the WHATWG specification (<https://websockets.spec.whatwg.org/#dom-websocket-websocket>)
        // doesn't mention it, `new WebSocket` can throw an exception if the URL is forbidden
        // for security reasons. We absord this exception as soon as it is thrown.
        // `connection` can be either a `WebSocket` object (the normal case), or a string
        // indicating an error message that must be propagated with `onConnectionReset` as soon
        // as possible, or `null` if the API user considers the connection as reset.
        let connection;
        try {
            connection = new WebSocket(config.address.url);
        }
        catch (error) {
            connection = error instanceof Error ? error.toString() : "Exception thrown by new WebSocket";
        }
        const bufferedAmountCheck = { quenedUnreportedBytes: 0, nextTimeout: 10 };
        const checkBufferedAmount = () => {
            if (!(connection instanceof WebSocket))
                return;
            if (connection.readyState != 1)
                return;
            // Note that we might expect `bufferedAmount` to always be <= the sum of the lengths
            // of all the data that has been sent, but that might not be the case. For this
            // reason, we use `bufferedAmount` as a hint rather than a correct value.
            const bufferedAmount = connection.bufferedAmount;
            let wasSent = bufferedAmountCheck.quenedUnreportedBytes - bufferedAmount;
            if (wasSent < 0)
                wasSent = 0;
            bufferedAmountCheck.quenedUnreportedBytes -= wasSent;
            if (bufferedAmountCheck.quenedUnreportedBytes != 0) {
                setTimeout(checkBufferedAmount, bufferedAmountCheck.nextTimeout);
                bufferedAmountCheck.nextTimeout *= 2;
                if (bufferedAmountCheck.nextTimeout > 500)
                    bufferedAmountCheck.nextTimeout = 500;
            }
            // Note: it is important to call `onWritableBytes` at the very end, as it might
            // trigger a call to `send`.
            if (wasSent != 0)
                config.onWritableBytes(wasSent);
        };
        if (connection instanceof WebSocket) {
            connection.binaryType = 'arraybuffer';
            connection.onopen = () => {
                config.onWritableBytes(1024 * 1024);
            };
            connection.onclose = (event) => {
                const message = "Error code " + event.code + (!!event.reason ? (": " + event.reason) : "");
                config.onConnectionReset(message);
            };
            connection.onmessage = (msg) => {
                config.onMessage(new Uint8Array(msg.data));
            };
        }
        else {
            setTimeout(() => {
                if (connection && !(connection instanceof WebSocket)) {
                    config.onConnectionReset(connection);
                    connection = null;
                }
            }, 1);
        }
        return {
            reset: () => {
                if (connection instanceof WebSocket) {
                    connection.onopen = null;
                    connection.onclose = null;
                    connection.onmessage = null;
                    connection.onerror = null;
                    // According to the WebSocket specification, calling `close()` when a WebSocket
                    // isn't fully opened yet is completely legal and seemingly a normal thing to
                    // do (see <https://websockets.spec.whatwg.org/#dom-websocket-close>).
                    // Unfortunately, browsers print a warning in the console if you do that. To
                    // avoid these warnings, we only call `close()` if the connection is fully
                    // opened. According to <https://websockets.spec.whatwg.org/#garbage-collection>,
                    // removing all the event listeners will cause the WebSocket to be garbage
                    // collected, which should have the same effect as `close()`.
                    if (connection.readyState == WebSocket.OPEN)
                        connection.close();
                }
                connection = null;
            },
            send: (data) => {
                if (bufferedAmountCheck.quenedUnreportedBytes == 0) {
                    bufferedAmountCheck.nextTimeout = 10;
                    setTimeout(checkBufferedAmount, 10);
                }
                for (const buffer of data) {
                    bufferedAmountCheck.quenedUnreportedBytes += buffer.length;
                }
                connection.send(new Blob(data));
            },
            closeSend: () => { throw new Error('Wrong connection type'); },
            openOutSubstream: () => { throw new Error('Wrong connection type'); }
        };
    }
    else if (config.address.ty === "webrtc") {
        const { targetPort, ipVersion, targetIp, remoteTlsCertificateSha256 } = config.address;
        const state = {
            pc: undefined,
            dataChannels: new Map(),
            nextStreamId: 0,
            isFirstOutSubstream: true,
        };
        // Kills all the JavaScript objects (the connection and all its substreams), ensuring that no
        // callback will be called again. Doesn't report anything to smoldot, as this should be done
        // by the caller.
        const killAllJs = () => {
            // The `RTCPeerConnection` is created pretty quickly. It is however still possible for
            // smoldot to cancel the opening, in which case `pc` will still be undefined.
            if (!state.pc) {
                console.assert(state.dataChannels.size === 0, "substreams exist while pc is undef");
                state.pc = null;
                return;
            }
            state.pc.onconnectionstatechange = null;
            state.pc.onnegotiationneeded = null;
            state.pc.ondatachannel = null;
            for (const channel of Array.from(state.dataChannels.values())) {
                channel.channel.onopen = null;
                channel.channel.onerror = null;
                channel.channel.onclose = null;
                channel.channel.onbufferedamountlow = null;
                channel.channel.onmessage = null;
            }
            state.dataChannels.clear();
            state.pc.close(); // Not necessarily necessary, but it doesn't hurt to do so.
        };
        // Function that configures a newly-opened channel and adds it to the map. Used for both
        // inbound and outbound substreams.
        const addChannel = (dataChannel, direction) => {
            const streamId = state.nextStreamId;
            state.nextStreamId += 1;
            dataChannel.binaryType = 'arraybuffer';
            let isOpen = { value: false };
            dataChannel.onopen = () => {
                console.assert(!isOpen.value, "substream opened twice");
                isOpen.value = true;
                config.onStreamOpened(streamId, direction);
                config.onWritableBytes(65536, streamId);
            };
            dataChannel.onerror = dataChannel.onclose = (event) => {
                // Note that Firefox doesn't support <https://developer.mozilla.org/en-US/docs/Web/API/RTCErrorEvent>.
                const message = (event instanceof RTCErrorEvent) ? event.error.toString() : "RTCDataChannel closed";
                if (!isOpen.value) {
                    // Substream wasn't opened yet and thus has failed to open. The API has no
                    // mechanism to report substream openings failures. We could try opening it
                    // again, but given that it's unlikely to succeed, we simply opt to kill the
                    // entire connection.
                    killAllJs();
                    // Note that the event doesn't give any additional reason for the failure.
                    config.onConnectionReset("data channel failed to open: " + message);
                }
                else {
                    // Substream was open and is now closed. Normal situation.
                    dataChannel.onopen = null;
                    dataChannel.onerror = null;
                    dataChannel.onclose = null;
                    dataChannel.onbufferedamountlow = null;
                    dataChannel.onmessage = null;
                    state.dataChannels.delete(streamId);
                    config.onStreamReset(streamId, message);
                }
            };
            dataChannel.onbufferedamountlow = () => {
                const channel = state.dataChannels.get(streamId);
                const val = channel.bufferedBytes;
                channel.bufferedBytes = 0;
                config.onWritableBytes(val, streamId);
            };
            dataChannel.onmessage = (m) => {
                // The `data` field is an `ArrayBuffer`.
                config.onMessage(new Uint8Array(m.data), streamId);
            };
            state.dataChannels.set(streamId, { channel: dataChannel, bufferedBytes: 0 });
        };
        // It is possible for the browser to use multiple different certificates.
        // In order for our local certificate to be deterministic, we need to generate it manually and
        // set it explicitly as part of the configuration.
        // According to <https://w3c.github.io/webrtc-pc/#dom-rtcpeerconnection-generatecertificate>,
        // browsers are guaranteed to support `{ name: "ECDSA", namedCurve: "P-256" }`.
        RTCPeerConnection.generateCertificate({ name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" }).then((localCertificate) => no_auto_bytecode_browser_awaiter(this, void 0, void 0, function* () {
            if (state.pc === null)
                return;
            // Due to <https://bugzilla.mozilla.org/show_bug.cgi?id=1659672>, connections from
            // Firefox to a localhost WebRTC server always fails. Since this bug has been opened
            // for three years at the time of writing, it is unlikely to be fixed in the short
            // term. In order to provider better user feedback, we straight up refuse connecting
            // and stop the connection.
            // Note that this is just a hint. Failing to detect this will lead to the WebRTC
            // handshake  timing out.
            // TODO: eventually remove this if the Firefox bug is fixed
            if ((targetIp == 'localhost' || targetIp == '127.0.0.1' || targetIp == '::1') && navigator.userAgent.indexOf('Firefox') !== -1) {
                killAllJs();
                config.onConnectionReset("Firefox can't connect to a localhost WebRTC server");
                return;
            }
            // Create a new WebRTC connection.
            state.pc = new RTCPeerConnection({ certificates: [localCertificate] });
            // We need to build the multihash corresponding to the local certificate.
            // While there exists a `RTCPeerConnection.getFingerprints` function, Firefox notably
            // doesn't support it.
            // See <https://developer.mozilla.org/en-US/docs/Web/API/RTCCertificate#browser_compatibility>
            // An alternative to `getFingerprints` is to ask the browser to generate an SDP offer and
            // extract from fingerprint from it. Because we explicitly provide a certificate, we have
            // the guarantee that the list of certificates will always be the same whenever an SDP offer
            // is generated by the browser. However, while this alternative does work on Firefox, it
            // doesn't on Chrome, as the SDP offer is for some reason missing the fingerprints.
            // Therefore, our strategy is to use `getFingerprints` when it is available (i.e. every
            // browser except Firefox), and parse the SDP offer when it is not (i.e. Firefox). In the
            // future, only `getFingerprints` would be used.
            let localTlsCertificateHex;
            if (localCertificate.getFingerprints) {
                for (const { algorithm, value } of localCertificate.getFingerprints()) {
                    if (algorithm === 'sha-256') {
                        localTlsCertificateHex = value;
                        break;
                    }
                }
            }
            else {
                const localSdpOffer = yield state.pc.createOffer();
                // Note that this regex is not strict. The browser isn't a malicious actor, and the
                // objective of this regex is not to detect invalid input.
                const localSdpOfferFingerprintMatch = localSdpOffer.sdp.match(/a(\s*)=(\s*)fingerprint:(\s*)(sha|SHA)-256(\s*)(([a-fA-F0-9]{2}(:)*){32})/);
                if (localSdpOfferFingerprintMatch) {
                    localTlsCertificateHex = localSdpOfferFingerprintMatch[6];
                }
            }
            if (localTlsCertificateHex === undefined) {
                // Because we've already returned from the `connect` function at this point, we pretend
                // that the connection has failed to open.
                config.onConnectionReset('Failed to obtain the browser certificate fingerprint');
                return;
            }
            let localTlsCertificateSha256 = new Uint8Array(32);
            localTlsCertificateSha256.set(localTlsCertificateHex.split(':').map((s) => parseInt(s, 16)), 0);
            // `onconnectionstatechange` is used to detect when the connection has closed or has failed
            // to open.
            // Note that smoldot will think that the connection is open even when it is still opening.
            // Therefore we don't care about events concerning the fact that the connection is now fully
            // open.
            state.pc.onconnectionstatechange = (_event) => {
                if (state.pc.connectionState == "closed" || state.pc.connectionState == "disconnected" || state.pc.connectionState == "failed") {
                    killAllJs();
                    config.onConnectionReset("WebRTC state transitioned to " + state.pc.connectionState);
                }
            };
            state.pc.onnegotiationneeded = (_event) => no_auto_bytecode_browser_awaiter(this, void 0, void 0, function* () {
                var _a;
                // Create a new offer and set it as local description.
                let sdpOffer = (yield state.pc.createOffer()).sdp;
                // We check that the locally-generated SDP offer has a data channel with the UDP
                // protocol. If that isn't the case, the connection will likely fail.
                if (sdpOffer.match(/^m=application(\s+)(\d+)(\s+)UDP\/DTLS\/SCTP(\s+)webrtc-datachannel$/m) === null) {
                    console.error("Local offer doesn't contain UDP data channel. WebRTC connections will likely fail. Please report this issue.");
                }
                // According to the libp2p WebRTC spec, the ufrag and pwd are the same
                // randomly-generated string on both sides, and must be prefixed with
                // `libp2p-webrtc-v1:`. We modify the local description to ensure that.
                // While we could randomly generate a new string, we just grab the one that the
                // browser has generated, in order to make sure that it respects the constraints
                // of the ICE protocol.
                const browserGeneratedPwd = (_a = sdpOffer.match(/^a=ice-pwd:(.+)$/m)) === null || _a === void 0 ? void 0 : _a.at(1);
                if (browserGeneratedPwd === undefined) {
                    console.error("Failed to set ufrag to pwd. WebRTC connections will likely fail. Please report this issue.");
                }
                const ufragPwd = "libp2p+webrtc+v1/" + browserGeneratedPwd;
                sdpOffer = sdpOffer.replace(/^a=ice-ufrag.*$/m, 'a=ice-ufrag:' + ufragPwd);
                sdpOffer = sdpOffer.replace(/^a=ice-pwd.*$/m, 'a=ice-pwd:' + ufragPwd);
                yield state.pc.setLocalDescription({ type: 'offer', sdp: sdpOffer });
                // Transform certificate hash into fingerprint (upper-hex; each byte separated by ":").
                const fingerprint = Array.from(remoteTlsCertificateSha256).map((n) => ("0" + n.toString(16)).slice(-2).toUpperCase()).join(':');
                // Note that the trailing line feed is important, as otherwise Chrome
                // fails to parse the payload.
                const remoteSdp = 
                // Version of the SDP protocol. Always 0. (RFC8866)
                "v=0" + "\n" +
                    // Identifies the creator of the SDP document. We are allowed to use dummy values
                    // (`-` and `0.0.0.0`) to remain anonymous, which we do. Note that "IN" means
                    // "Internet" (and not "input"). (RFC8866)
                    "o=- 0 0 IN IP" + ipVersion + " " + targetIp + "\n" +
                    // Name for the session. We are allowed to pass a dummy `-`. (RFC8866)
                    "s=-" + "\n" +
                    // Start and end of the validity of the session. `0 0` means that the session never
                    // expires. (RFC8866)
                    "t=0 0" + "\n" +
                    // A lite implementation is only appropriate for devices that will
                    // always be connected to the public Internet and have a public
                    // IP address at which it can receive packets from any
                    // correspondent.  ICE will not function when a lite implementation
                    // is placed behind a NAT (RFC8445).
                    "a=ice-lite" + "\n" +
                    // A `m=` line describes a request to establish a certain protocol.
                    // The protocol in this line (i.e. `TCP/DTLS/SCTP` or `UDP/DTLS/SCTP`) must always be
                    // the same as the one in the offer. We know that this is true because checked above.
                    // The `<fmt>` component must always be `webrtc-datachannel` for WebRTC.
                    // The rest of the SDP payload adds attributes to this specific media stream.
                    // RFCs: 8839, 8866, 8841
                    "m=application " + String(targetPort) + " " + "UDP/DTLS/SCTP webrtc-datachannel" + "\n" +
                    // Indicates the IP address of the remote.
                    // Note that "IN" means "Internet" (and not "input").
                    "c=IN IP" + ipVersion + " " + targetIp + "\n" +
                    // Media ID - uniquely identifies this media stream (RFC9143).
                    "a=mid:0" + "\n" +
                    // Indicates that we are complying with RFC8839 (as oppposed to the legacy RFC5245).
                    "a=ice-options:ice2" + "\n" +
                    // ICE username and password, which are used for establishing and
                    // maintaining the ICE connection. (RFC8839)
                    // These values are set according to the libp2p WebRTC specification.
                    "a=ice-ufrag:" + ufragPwd + "\n" +
                    "a=ice-pwd:" + ufragPwd + "\n" +
                    // Fingerprint of the certificate that the server will use during the TLS
                    // handshake. (RFC8122)
                    // MUST be derived from the certificate used by the answerer (server).
                    "a=fingerprint:sha-256 " + fingerprint + "\n" +
                    // Indicates that the remote DTLS server will only listen for incoming
                    // connections. (RFC5763)
                    // The answerer (server) MUST not be located behind a NAT (RFC6135).
                    "a=setup:passive" + "\n" +
                    // The SCTP port (RFC8841)
                    // Note it's different from the "m=" line port value, which
                    // indicates the port of the underlying transport-layer protocol
                    // (UDP or TCP)
                    "a=sctp-port:5000" + "\n" +
                    // The maximum SCTP user message size (in bytes) (RFC8841)
                    // Setting this field is part of the libp2p spec.
                    "a=max-message-size:16384" + "\n" +
                    // A transport address for a candidate that can be used for connectivity
                    // checks (RFC8839).
                    "a=candidate:1 1 UDP 1 " + targetIp + " " + String(targetPort) + " typ host" + "\n";
                yield state.pc.setRemoteDescription({ type: "answer", sdp: remoteSdp });
            });
            state.pc.ondatachannel = ({ channel }) => {
                // TODO: is the substream maybe already open? according to the Internet it seems that no but it's unclear
                addChannel(channel, 'inbound');
            };
            config.onMultistreamHandshakeInfo({
                handshake: 'webrtc',
                localTlsCertificateSha256,
            });
        }));
        return {
            reset: (streamId) => {
                // If `streamId` is undefined, then the whole connection must be destroyed.
                if (streamId === undefined) {
                    killAllJs();
                }
                else {
                    const channel = state.dataChannels.get(streamId);
                    channel.channel.onopen = null;
                    channel.channel.onerror = null;
                    channel.channel.onclose = null;
                    channel.channel.onbufferedamountlow = null;
                    channel.channel.onmessage = null;
                    channel.channel.close();
                    state.dataChannels.delete(streamId);
                }
            },
            send: (data, streamId) => {
                const channel = state.dataChannels.get(streamId);
                for (const buffer of data) {
                    channel.bufferedBytes += buffer.length;
                }
                channel.channel.send(new Blob(data));
            },
            closeSend: () => { throw new Error('Wrong connection type'); },
            openOutSubstream: () => {
                // `openOutSubstream` can only be called after we have called `config.onOpen`,
                // therefore `pc` is guaranteed to be non-null.
                // Note that the label passed to `createDataChannel` is required to be empty as
                // per the libp2p WebRTC specification.
                // TODO: adjusting the options based on the first substream is a bit hacky
                const opts = state.isFirstOutSubstream ? { negotiated: true, id: 0 } : {};
                state.isFirstOutSubstream = false;
                addChannel(state.pc.createDataChannel("", opts), 'outbound');
            }
        };
    }
    else {
        // Should never happen, as we tweak the options to refuse connection types that
        // we don't support.
        throw new Error();
    }
}


/***/ }),

/***/ 26127:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   A_: () => (/* binding */ AlreadyDestroyedError),
/* harmony export */   BU: () => (/* binding */ JsonRpcDisabledError),
/* harmony export */   LX: () => (/* binding */ CrashError),
/* harmony export */   iA: () => (/* binding */ AddChainError),
/* harmony export */   t_: () => (/* binding */ QueueFullError)
/* harmony export */ });
// Smoldot
// Copyright (C) 2019-2022  Parity Technologies (UK) Ltd.
// SPDX-License-Identifier: GPL-3.0-or-later WITH Classpath-exception-2.0
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
/**
 * Thrown in case of a problem when initializing the chain.
 */
class AddChainError extends Error {
    constructor(message) {
        super(message);
        this.name = "AddChainError";
    }
}
/**
 * Thrown in case the API user tries to use a chain or client that has already been destroyed.
 */
class AlreadyDestroyedError extends Error {
    constructor() {
        super();
        this.name = "AlreadyDestroyedError";
    }
}
/**
 * Thrown when trying to send a JSON-RPC message to a chain whose JSON-RPC system hasn't been
 * enabled.
 */
class JsonRpcDisabledError extends Error {
    constructor() {
        super();
        this.name = "JsonRpcDisabledError";
    }
}
/**
 * Thrown in case the underlying client encounters an unexpected crash.
 *
 * This is always an internal bug in smoldot and is never supposed to happen.
 */
class CrashError extends Error {
    constructor(message) {
        super(message);
    }
}
/**
 * Thrown in case the buffer of JSON-RPC requests is full and cannot accept any more request.
 */
class QueueFullError extends Error {
    constructor() {
        super("JSON-RPC requests queue is full");
    }
}


/***/ })

}]);