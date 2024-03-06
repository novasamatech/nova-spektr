/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 34182:
/***/ ((__unused_webpack_module, __unused_webpack___webpack_exports__, __webpack_require__) => {

"use strict";

// UNUSED EXPORTS: proxyWorker, state

// EXTERNAL MODULE: ./node_modules/.pnpm/@remote-ui+rpc@1.4.4/node_modules/@remote-ui/rpc/build/esm/endpoint.mjs
var endpoint = __webpack_require__(21913);
// EXTERNAL MODULE: ./node_modules/.pnpm/@polkadot+rpc-provider@10.11.2/node_modules/@polkadot/rpc-provider/ws/index.js
var ws = __webpack_require__(68884);
// EXTERNAL MODULE: ./node_modules/.pnpm/@polkadot+rpc-provider@10.11.2/node_modules/@polkadot/rpc-provider/substrate-connect/index.js
var substrate_connect = __webpack_require__(90416);
// EXTERNAL MODULE: ./node_modules/.pnpm/@polkadot+api@10.11.2/node_modules/@polkadot/api/promise/Api.js
var Api = __webpack_require__(66223);
// EXTERNAL MODULE: ./node_modules/.pnpm/@substrate+connect@0.8.1/node_modules/@substrate/connect/dist/index.js
var dist = __webpack_require__(58711);
// EXTERNAL MODULE: ./node_modules/.pnpm/effector@23.1.0/node_modules/effector/effector.mjs
var effector = __webpack_require__(86311);
;// CONCATENATED MODULE: ./src/renderer/shared/core/model/kernel-model.ts
var appStarted=(0,effector/* createEvent */.yM)();var kernelModel={events:{appStarted:appStarted}};
;// CONCATENATED MODULE: ./src/renderer/shared/core/types/general.ts
var CryptoType;(function(CryptoType){CryptoType[CryptoType["SR25519"]=0]="SR25519";CryptoType[CryptoType["ED25519"]=1]="ED25519";CryptoType[CryptoType["ECDSA"]=2]="ECDSA";CryptoType[CryptoType["ETHEREUM"]=3]="ETHEREUM"})(CryptoType||(CryptoType={}));var ChainType;(function(ChainType){ChainType[ChainType["SUBSTRATE"]=0]="SUBSTRATE";ChainType[ChainType["ETHEREUM"]=1]="ETHEREUM"})(ChainType||(ChainType={}));var CryptoTypeString;(function(CryptoTypeString){CryptoTypeString["SR25519"]="SR25519";CryptoTypeString["ED25519"]="ED25519";CryptoTypeString["ECDSA"]="ECDSA";CryptoTypeString["ETHEREUM"]="ETHEREUM"})(CryptoTypeString||(CryptoTypeString={}));var ErrorType;(function(ErrorType){ErrorType["REQUIRED"]="required";ErrorType["VALIDATE"]="validate";ErrorType["PATTERN"]="pattern";ErrorType["MAX_LENGTH"]="maxLength"})(ErrorType||(ErrorType={}));
;// CONCATENATED MODULE: ./src/renderer/shared/core/types/wallet.ts
var WalletType;(function(WalletType){WalletType["WATCH_ONLY"]="wallet_wo";WalletType["POLKADOT_VAULT"]="wallet_pv";WalletType["MULTISIG"]="wallet_ms";WalletType["WALLET_CONNECT"]="wallet_wc";WalletType["NOVA_WALLET"]="wallet_nw";WalletType["PROXIED"]="wallet_pxd";WalletType["MULTISHARD_PARITY_SIGNER"]="wallet_mps";WalletType["SINGLE_PARITY_SIGNER"]="wallet_sps"})(WalletType||(WalletType={}));var SigningType;(function(SigningType){SigningType["WATCH_ONLY"]="signing_wo";SigningType["PARITY_SIGNER"]="signing_ps";SigningType["MULTISIG"]="signing_ms";SigningType["POLKADOT_VAULT"]="signing_pv";SigningType["WALLET_CONNECT"]="signing_wc"})(SigningType||(SigningType={}));
;// CONCATENATED MODULE: ./src/renderer/shared/core/types/account.ts
var AccountType;(function(AccountType){AccountType["BASE"]="base";AccountType["CHAIN"]="chain";AccountType["SHARD"]="shard";AccountType["MULTISIG"]="multisig";AccountType["WALLET_CONNECT"]="wallet_connect";AccountType["PROXIED"]="proxied"})(AccountType||(AccountType={}));var KeyType;(function(KeyType){KeyType["MAIN"]="main";KeyType["PUBLIC"]="pub";KeyType["HOT"]="hot";KeyType["GOVERNANCE"]="governance";KeyType["STAKING"]="staking";KeyType["CUSTOM"]="custom"})(KeyType||(KeyType={}));
;// CONCATENATED MODULE: ./src/renderer/shared/core/types/asset.ts
var StakingType;(function(StakingType){StakingType["RELAYCHAIN"]="relaychain"})(StakingType||(StakingType={}));var AssetType;(function(AssetType){AssetType["ORML"]="orml";AssetType["STATEMINE"]="statemine"})(AssetType||(AssetType={}));
;// CONCATENATED MODULE: ./src/renderer/shared/core/types/balance.ts
var LockTypes;(function(LockTypes){LockTypes["STAKING"]="0x7374616b696e6720"})(LockTypes||(LockTypes={}));
;// CONCATENATED MODULE: ./src/renderer/shared/core/types/connection.ts
var ConnectionType;(function(ConnectionType){ConnectionType["LIGHT_CLIENT"]="LIGHT_CLIENT";ConnectionType["AUTO_BALANCE"]="AUTO_BALANCE";ConnectionType["RPC_NODE"]="RPC_NODE";ConnectionType["DISABLED"]="DISABLED"})(ConnectionType||(ConnectionType={}));var ConnectionStatus;(function(ConnectionStatus){ConnectionStatus["DISCONNECTED"]="DISCONNECTED";ConnectionStatus["CONNECTING"]="CONNECTING";ConnectionStatus["CONNECTED"]="CONNECTED";ConnectionStatus["ERROR"]="ERROR"})(ConnectionStatus||(ConnectionStatus={}));
;// CONCATENATED MODULE: ./src/renderer/shared/core/types/stake.ts
var RewardsDestination;(function(RewardsDestination){RewardsDestination["RESTAKE"]="restake";RewardsDestination["TRANSFERABLE"]="transferable"})(RewardsDestination||(RewardsDestination={}));
;// CONCATENATED MODULE: ./src/renderer/shared/core/types/proxy.ts
var ProxyType;(function(ProxyType){ProxyType["ANY"]="Any";ProxyType["NON_TRANSFER"]="NonTransfer";ProxyType["STAKING"]="Staking";ProxyType["AUCTION"]="Auction";ProxyType["CANCEL_PROXY"]="CancelProxy";ProxyType["GOVERNANCE"]="Governance";ProxyType["IDENTITY_JUDGEMENT"]="IdentityJudgement";ProxyType["NOMINATION_POOLS"]="NominationPools"})(ProxyType||(ProxyType={}));var ProxyVariant;(function(ProxyVariant){ProxyVariant["NONE"]="none";ProxyVariant["PURE"]="pure";ProxyVariant["REGULAR"]="regular"})(ProxyVariant||(ProxyVariant={}));
;// CONCATENATED MODULE: ./src/renderer/shared/core/types/notification.ts
var NotificationType;(function(NotificationType){NotificationType["MULTISIG_INVITE"]="MultisigAccountInvitedNotification";NotificationType["MULTISIG_CREATED"]="MultisigCreatedNotification";NotificationType["MULTISIG_APPROVED"]="MultisigApprovedNotification";NotificationType["MULTISIG_EXECUTED"]="MultisigExecutedNotification";NotificationType["MULTISIG_CANCELLED"]="MultisigCancelledNotification";NotificationType["PROXY_CREATED"]="ProxyCreatedNotification";NotificationType["PROXY_REMOVED"]="ProxyRemovedNotification"})(NotificationType||(NotificationType={}));
;// CONCATENATED MODULE: ./src/renderer/shared/core/types/substrate.ts
var XcmPallets;(function(XcmPallets){XcmPallets["XTOKENS"]="xTokens";XcmPallets["XCM_PALLET"]="xcmPallet";XcmPallets["POLKADOT_XCM"]="polkadotXcm"})(XcmPallets||(XcmPallets={}));
;// CONCATENATED MODULE: ./src/renderer/shared/core/index.ts

// EXTERNAL MODULE: ./node_modules/.pnpm/@polkadot+util@12.6.2/node_modules/@polkadot/util/u8a/toHex.js
var toHex = __webpack_require__(26048);
// EXTERNAL MODULE: ./node_modules/.pnpm/@polkadot+util-crypto@12.6.2_@polkadot+util@12.6.2/node_modules/@polkadot/util-crypto/address/decode.js
var decode = __webpack_require__(82628);
;// CONCATENATED MODULE: ./src/renderer/features/proxies/lib/worker-utils.ts
function _define_property(obj,key,value){if(key in obj){Object.defineProperty(obj,key,{value:value,enumerable:true,configurable:true,writable:true})}else{obj[key]=value}return obj}var proxyWorkerUtils={toAccountId:toAccountId,isSameProxy:isSameProxy,isSameProxied:isSameProxied,isProxiedAccount:isProxiedAccount,isApiConnected:isApiConnected,isDelayedProxy:isDelayedProxy,getKnownChain:getKnownChain};function toAccountId(address){try{return (0,toHex/* u8aToHex */.c)((0,decode/* decodeAddress */.m)(address))}catch(e){return"0x00"}}function isSameProxy(oldProxy,newProxy){return oldProxy.accountId===newProxy.accountId&&oldProxy.proxiedAccountId===newProxy.proxiedAccountId&&oldProxy.chainId===newProxy.chainId&&oldProxy.proxyType===newProxy.proxyType&&oldProxy.delay===newProxy.delay}function isSameProxied(oldProxy,newProxy){return oldProxy.accountId===newProxy.accountId&&oldProxy.proxyAccountId===newProxy.proxyAccountId&&oldProxy.chainId===newProxy.chainId&&oldProxy.proxyType===newProxy.proxyType&&oldProxy.delay===newProxy.delay}function isProxiedAccount(account){return account.type===AccountType.PROXIED}function isApiConnected(apis,chainId){var _api;var api=apis[chainId];return Boolean((_api=api)===null||_api===void 0?void 0:_api.isConnected)}function isDelayedProxy(proxy){return proxy.delay!==0}var MainChains={POLKADOT:"0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",KUSAMA:"0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe"};var _obj;var KnownChains=(_obj={},_define_property(_obj,MainChains.POLKADOT,dist.WellKnownChain.polkadot),_define_property(_obj,MainChains.KUSAMA,dist.WellKnownChain.ksmcc3),_obj);function getKnownChain(chainId){return KnownChains[chainId]}
;// CONCATENATED MODULE: ./src/renderer/features/proxies/workers/proxy-worker.ts
function asyncGeneratorStep(gen,resolve,reject,_next,_throw,key,arg){try{var info=gen[key](arg);var value=info.value}catch(error){reject(error);return}if(info.done){resolve(value)}else{Promise.resolve(value).then(_next,_throw)}}function _async_to_generator(fn){return function(){var self1=this,args=arguments;return new Promise(function(resolve,reject){var gen=fn.apply(self1,args);function _next(value){asyncGeneratorStep(gen,resolve,reject,_next,_throw,"next",value)}function _throw(err){asyncGeneratorStep(gen,resolve,reject,_next,_throw,"throw",err)}_next(undefined)})}}function proxy_worker_define_property(obj,key,value){if(key in obj){Object.defineProperty(obj,key,{value:value,enumerable:true,configurable:true,writable:true})}else{obj[key]=value}return obj}function _object_spread(target){for(var i=1;i<arguments.length;i++){var source=arguments[i]!=null?arguments[i]:{};var ownKeys=Object.keys(source);if(typeof Object.getOwnPropertySymbols==="function"){ownKeys=ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function(sym){return Object.getOwnPropertyDescriptor(source,sym).enumerable}))}ownKeys.forEach(function(key){proxy_worker_define_property(target,key,source[key])})}return target}function ownKeys(object,enumerableOnly){var keys=Object.keys(object);if(Object.getOwnPropertySymbols){var symbols=Object.getOwnPropertySymbols(object);if(enumerableOnly){symbols=symbols.filter(function(sym){return Object.getOwnPropertyDescriptor(object,sym).enumerable})}keys.push.apply(keys,symbols)}return keys}function _object_spread_props(target,source){source=source!=null?source:{};if(Object.getOwnPropertyDescriptors){Object.defineProperties(target,Object.getOwnPropertyDescriptors(source))}else{ownKeys(Object(source)).forEach(function(key){Object.defineProperty(target,key,Object.getOwnPropertyDescriptor(source,key))})}return target}function _ts_generator(thisArg,body){var f,y,t,g,_={label:0,sent:function(){if(t[0]&1)throw t[1];return t[1]},trys:[],ops:[]};return g={next:verb(0),"throw":verb(1),"return":verb(2)},typeof Symbol==="function"&&(g[Symbol.iterator]=function(){return this}),g;function verb(n){return function(v){return step([n,v])}}function step(op){if(f)throw new TypeError("Generator is already executing.");while(_)try{if(f=1,y&&(t=op[0]&2?y["return"]:op[0]?y["throw"]||((t=y["return"])&&t.call(y),0):y.next)&&!(t=t.call(y,op[1])).done)return t;if(y=0,t)op=[op[0]&2,t.value];switch(op[0]){case 0:case 1:t=op;break;case 4:_.label++;return{value:op[1],done:false};case 5:_.label++;y=op[1];op=[0];continue;case 7:op=_.ops.pop();_.trys.pop();continue;default:if(!(t=_.trys,t=t.length>0&&t[t.length-1])&&(op[0]===6||op[0]===2)){_=0;continue}if(op[0]===3&&(!t||op[1]>t[0]&&op[1]<t[3])){_.label=op[1];break}if(op[0]===6&&_.label<t[1]){_.label=t[1];t=op;break}if(t&&_.label<t[2]){_.label=t[2];_.ops.push(op);break}if(t[2])_.ops.pop();_.trys.pop();continue}op=body.call(thisArg,_)}catch(e){op=[6,e];y=0}finally{f=t=0}if(op[0]&5)throw op[1];return{value:op[0]?op[1]:void 0,done:true}}}var proxyWorker={initConnection:initConnection,getProxies:getProxies,disconnect:disconnect};var state={apis:{}};var InitConnectionsResult={SUCCESS:"success",FAILED:"failed"};function initConnection(chain,connection){return new Promise(function(resolve,reject){if(!chain){console.log("proxy-worker: chain not provided");reject();return}try{var provider;if(!connection||connection.connectionType===ConnectionType.AUTO_BALANCE){var _connection;provider=new ws/* WsProvider */.U(chain.nodes.concat(((_connection=connection)===null||_connection===void 0?void 0:_connection.customNodes)||[]).map(function(node){return node.url}))}else if(connection.connectionType===ConnectionType.RPC_NODE){var _connection_activeNode;provider=new ws/* WsProvider */.U([((_connection_activeNode=connection.activeNode)===null||_connection_activeNode===void 0?void 0:_connection_activeNode.url)||""])}else if(connection.connectionType===ConnectionType.LIGHT_CLIENT){try{var knownChainId=proxyWorkerUtils.getKnownChain(chain.chainId);if(knownChainId){provider=new substrate_connect/* ScProvider */.x(dist,knownChainId);provider.connect()}}catch(e){console.log("proxy-worker: light client not connected",e);reject();return}}if(!provider){console.log("proxy-worker: provider not connected");reject();return}provider.on("connected",_async_to_generator(function(){var _,_1;return _ts_generator(this,function(_state){switch(_state.label){case 0:_=state.apis;_1=chain.chainId;return[4,Api/* ApiPromise */.G.create({provider:provider,throwOnConnect:true,throwOnUnknown:true})];case 1:_[_1]=_state.sent();console.log("proxy-worker: provider connected successfully");resolve(InitConnectionsResult.SUCCESS);return[2]}})}))}catch(e){console.log("proxy-worker: error in initConnection",e);reject()}})}function disconnect(chainId){return _disconnect.apply(this,arguments)}function _disconnect(){_disconnect=_async_to_generator(function(chainId){return _ts_generator(this,function(_state){switch(_state.label){case 0:if(!proxyWorkerUtils.isApiConnected(state.apis,chainId))return[2];console.log("proxy-worker: disconnecting from chainId",chainId);return[4,state.apis[chainId].disconnect()];case 1:_state.sent();return[2]}})});return _disconnect.apply(this,arguments)}function getProxies(_){return _getProxies.apply(this,arguments)}function _getProxies(){_getProxies=_async_to_generator(function(param){var chainId,accountsForProxy,accountsForProxied,proxiedAccounts,proxies,api,existingProxies,proxiesToAdd,existingProxiedAccounts,proxiedAccountsToAdd,deposits,keys,proxiesRequests,e,proxiesToRemove,proxiedAccountsToRemove;return _ts_generator(this,function(_state){switch(_state.label){case 0:chainId=param.chainId,accountsForProxy=param.accountsForProxy,accountsForProxied=param.accountsForProxied,proxiedAccounts=param.proxiedAccounts,proxies=param.proxies;api=state.apis[chainId];existingProxies=[];proxiesToAdd=[];existingProxiedAccounts=[];proxiedAccountsToAdd=[];deposits={chainId:chainId,deposits:{}};if(!api||!api.query.proxy){return[2,{proxiesToAdd:proxiesToAdd,proxiesToRemove:[],proxiedAccountsToAdd:proxiedAccountsToAdd,proxiedAccountsToRemove:[],deposits:deposits}]}_state.label=1;case 1:_state.trys.push([1,4,,5]);return[4,api.query.proxy.proxies.keys()];case 2:keys=_state.sent();proxiesRequests=keys.map(function(){var _ref=_async_to_generator(function(key){var proxyData,proxiedAccountId,e;return _ts_generator(this,function(_state){switch(_state.label){case 0:_state.trys.push([0,2,,3]);return[4,api.rpc.state.queryStorageAt([key])];case 1:proxyData=_state.sent();proxiedAccountId=key.args[0].toHex();proxyData[0][0].toHuman().forEach(function(account){var _account;var newProxy={chainId:chainId,proxiedAccountId:proxiedAccountId,accountId:proxyWorkerUtils.toAccountId((_account=account)===null||_account===void 0?void 0:_account.delegate),proxyType:account.proxyType,delay:Number(account.delay)};var needToAddProxiedAccount=accountsForProxied[newProxy.accountId]&&!proxyWorkerUtils.isDelayedProxy(newProxy);if(needToAddProxiedAccount){var proxiedAccount=_object_spread_props(_object_spread({},newProxy),{proxyAccountId:newProxy.accountId,accountId:newProxy.proxiedAccountId,proxyVariant:ProxyVariant.NONE});var doesProxiedAccountExist=proxiedAccounts.some(function(oldProxy){return proxyWorkerUtils.isSameProxied(oldProxy,proxiedAccount)});console.log("proxy-worker ".concat(api.genesisHash,": found \uD83D\uDFE3 proxied account: "),proxiedAccount);if(!doesProxiedAccountExist){console.log("proxy-worker ".concat(api.genesisHash,": \uD83D\uDFE3 proxied should be added: "),proxiedAccount);proxiedAccountsToAdd.push(proxiedAccount)}existingProxiedAccounts.push(proxiedAccount)}if(needToAddProxiedAccount){deposits.deposits[proxiedAccountId]=proxyData[0][1].toHuman()}});proxyData[0][0].toHuman().forEach(function(account){var _account;var newProxy={chainId:chainId,proxiedAccountId:proxiedAccountId,accountId:proxyWorkerUtils.toAccountId((_account=account)===null||_account===void 0?void 0:_account.delegate),proxyType:account.proxyType,delay:Number(account.delay)};var needToAddProxyAccount=accountsForProxy[proxiedAccountId]||proxiedAccountsToAdd.some(function(p){return p.accountId===proxiedAccountId});var doesProxyExist=proxies.some(function(oldProxy){return proxyWorkerUtils.isSameProxy(oldProxy,newProxy)});if(needToAddProxyAccount){console.log("proxy-worker ".concat(api.genesisHash,": found \uD83D\uDD35 proxy : "),newProxy);if(!doesProxyExist){console.log("proxy-worker ".concat(api.genesisHash,": \uD83D\uDD35 proxy  should be added: "),newProxy);proxiesToAdd.push(newProxy)}existingProxies.push(newProxy)}if(needToAddProxyAccount){deposits.deposits[proxiedAccountId]=proxyData[0][1].toHuman()}});return[3,3];case 2:e=_state.sent();console.log("proxy-worker ".concat(api.genesisHash,": proxy error"),e);return[3,3];case 3:return[2]}})});return function(key){return _ref.apply(this,arguments)}}());return[4,Promise.all(proxiesRequests)];case 3:_state.sent();return[3,5];case 4:e=_state.sent();console.log("proxy-worker ".concat(api.genesisHash,": error in getProxies"),e);return[3,5];case 5:proxiesToRemove=proxies.filter(function(p){return!existingProxies.some(function(ep){return proxyWorkerUtils.isSameProxy(p,ep)})});console.log("proxy-worker ".concat(api.genesisHash,": \uD83D\uDD35 proxy accounts to remove: "),proxiesToRemove);proxiedAccountsToRemove=Object.values(proxiedAccounts).filter(function(p){return!existingProxiedAccounts.some(function(ep){return ep.accountId===p.accountId&&ep.chainId===p.chainId&&ep.proxyAccountId===p.proxyAccountId&&ep.proxyVariant===p.proxyVariant&&ep.delay===p.delay&&ep.proxyType===p.proxyType})});console.log("proxy-worker ".concat(api.genesisHash,": \uD83D\uDFE3 proxied accounts to remove: "),proxiedAccountsToRemove);return[2,{proxiesToAdd:proxiesToAdd,proxiesToRemove:proxiesToRemove,proxiedAccountsToAdd:proxiedAccountsToAdd,proxiedAccountsToRemove:proxiedAccountsToRemove,deposits:deposits}]}})});return _getProxies.apply(this,arguments)}var proxy_worker_endpoint=(0,endpoint/* createEndpoint */.dg)(self);proxy_worker_endpoint.expose({initConnection:initConnection,getProxies:getProxies,disconnect:disconnect});console.log("proxy-worker: worker started successfully");

/***/ }),

/***/ 79391:
/***/ (() => {

/* (ignored) */

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/******/ 	// the startup function
/******/ 	__webpack_require__.x = () => {
/******/ 		// Load entry module and return exports
/******/ 		// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 		var __webpack_exports__ = __webpack_require__.O(undefined, [838], () => (__webpack_require__(34182)))
/******/ 		__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 		return __webpack_exports__;
/******/ 	};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks and sibling chunks for the entrypoint
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".renderer-" + __webpack_require__.h() + ".js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get mini-css chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks and sibling chunks for the entrypoint
/******/ 		__webpack_require__.miniCssF = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return undefined;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/getFullHash */
/******/ 	(() => {
/******/ 		__webpack_require__.h = () => ("923639ca908855964346")
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/node module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.nmd = (module) => {
/******/ 			module.paths = [];
/******/ 			if (!module.children) module.children = [];
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript)
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && !scriptUrl) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/importScripts chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "already loaded"
/******/ 		var installedChunks = {
/******/ 			381: 1
/******/ 		};
/******/ 		
/******/ 		// importScripts chunk loading
/******/ 		var installChunk = (data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			while(chunkIds.length)
/******/ 				installedChunks[chunkIds.pop()] = 1;
/******/ 			parentChunkLoadingFunction(data);
/******/ 		};
/******/ 		__webpack_require__.f.i = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					importScripts(__webpack_require__.p + __webpack_require__.u(chunkId));
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunknova_spektr"] = self["webpackChunknova_spektr"] || [];
/******/ 		var parentChunkLoadingFunction = chunkLoadingGlobal.push.bind(chunkLoadingGlobal);
/******/ 		chunkLoadingGlobal.push = installChunk;
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/startup chunk dependencies */
/******/ 	(() => {
/******/ 		var next = __webpack_require__.x;
/******/ 		__webpack_require__.x = () => {
/******/ 			return __webpack_require__.e(838).then(next);
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// run startup
/******/ 	var __webpack_exports__ = __webpack_require__.x();
/******/ 	
/******/ })()
;