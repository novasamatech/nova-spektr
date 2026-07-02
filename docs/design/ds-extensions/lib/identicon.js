/* Polkadot identicon generator for the Nova Spektr UI kit.
   Faithful port of @polkadot/ui-shared icons/polkadot.ts (Apache-2.0),
   with a self-contained blake2b-512 (port of blakejs, CC0).
   Exposes window.nsPolkadotIcon(seed, size) -> data-URI SVG string.
   The 32-byte public key is derived deterministically from the seed via
   blake2b, so it works without a live SS58 address while producing a
   genuine Polkadot identicon. */
(function () {
  'use strict';

  // ---- blake2b (blakejs port) ----
  var BLAKE2B_IV32 = new Uint32Array([
    0xf3bcc908, 0x6a09e667, 0x84caa73b, 0xbb67ae85, 0xfe94f82b, 0x3c6ef372,
    0x5f1d36f1, 0xa54ff53a, 0xade682d1, 0x510e527f, 0x2b3e6c1f, 0x9b05688c,
    0xfb41bd6b, 0x1f83d9ab, 0x137e2179, 0x5be0cd19
  ]);
  var SIGMA8 = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3,
    11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4,
    7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8,
    9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13,
    2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9,
    12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11,
    13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10,
    6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5,
    10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3
  ];
  var SIGMA82 = new Uint8Array(SIGMA8.map(function (x) { return x * 2; }));
  var v = new Uint32Array(32);
  var m = new Uint32Array(32);

  function ADD64AA(va, a, b) {
    var o0 = va[a] + va[b];
    var o1 = va[a + 1] + va[b + 1];
    if (o0 >= 0x100000000) o1++;
    va[a] = o0; va[a + 1] = o1;
  }
  function ADD64AC(va, a, b0, b1) {
    var o0 = va[a] + b0;
    if (b0 < 0) o0 += 0x100000000;
    var o1 = va[a + 1] + b1;
    if (o0 >= 0x100000000) o1++;
    va[a] = o0; va[a + 1] = o1;
  }
  function B2B_GET32(arr, i) {
    return arr[i] ^ (arr[i + 1] << 8) ^ (arr[i + 2] << 16) ^ (arr[i + 3] << 24);
  }
  function B2B_G(a, b, c, d, ix, iy) {
    var x0 = m[ix], x1 = m[ix + 1], y0 = m[iy], y1 = m[iy + 1];
    ADD64AA(v, a, b); ADD64AC(v, a, x0, x1);
    var xor0 = v[d] ^ v[a], xor1 = v[d + 1] ^ v[a + 1];
    v[d] = xor1; v[d + 1] = xor0;
    ADD64AA(v, c, d);
    xor0 = v[b] ^ v[c]; xor1 = v[b + 1] ^ v[c + 1];
    v[b] = (xor0 >>> 24) ^ (xor1 << 8); v[b + 1] = (xor1 >>> 24) ^ (xor0 << 8);
    ADD64AA(v, a, b); ADD64AC(v, a, y0, y1);
    xor0 = v[d] ^ v[a]; xor1 = v[d + 1] ^ v[a + 1];
    v[d] = (xor0 >>> 16) ^ (xor1 << 16); v[d + 1] = (xor1 >>> 16) ^ (xor0 << 16);
    ADD64AA(v, c, d);
    xor0 = v[b] ^ v[c]; xor1 = v[b + 1] ^ v[c + 1];
    v[b] = (xor1 >>> 31) ^ (xor0 << 1); v[b + 1] = (xor0 >>> 31) ^ (xor1 << 1);
  }
  function compress(ctx, last) {
    var i;
    for (i = 0; i < 16; i++) { v[i] = ctx.h[i]; v[i + 16] = BLAKE2B_IV32[i]; }
    v[24] = v[24] ^ ctx.t; v[25] = v[25] ^ (ctx.t / 0x100000000);
    if (last) { v[28] = ~v[28]; v[29] = ~v[29]; }
    for (i = 0; i < 32; i++) m[i] = B2B_GET32(ctx.b, 4 * i);
    for (i = 0; i < 12; i++) {
      B2B_G(0, 8, 16, 24, SIGMA82[i * 16 + 0], SIGMA82[i * 16 + 1]);
      B2B_G(2, 10, 18, 26, SIGMA82[i * 16 + 2], SIGMA82[i * 16 + 3]);
      B2B_G(4, 12, 20, 28, SIGMA82[i * 16 + 4], SIGMA82[i * 16 + 5]);
      B2B_G(6, 14, 22, 30, SIGMA82[i * 16 + 6], SIGMA82[i * 16 + 7]);
      B2B_G(0, 10, 20, 30, SIGMA82[i * 16 + 8], SIGMA82[i * 16 + 9]);
      B2B_G(2, 12, 22, 24, SIGMA82[i * 16 + 10], SIGMA82[i * 16 + 11]);
      B2B_G(4, 14, 16, 26, SIGMA82[i * 16 + 12], SIGMA82[i * 16 + 13]);
      B2B_G(6, 8, 18, 28, SIGMA82[i * 16 + 14], SIGMA82[i * 16 + 15]);
    }
    for (i = 0; i < 16; i++) ctx.h[i] = ctx.h[i] ^ v[i] ^ v[i + 16];
  }
  function blake2b(input, outlen) {
    outlen = outlen || 64;
    var ctx = { b: new Uint8Array(128), h: new Uint32Array(16), t: 0, c: 0, outlen: outlen };
    var i;
    for (i = 0; i < 16; i++) ctx.h[i] = BLAKE2B_IV32[i];
    ctx.h[0] ^= 0x01010000 ^ outlen;
    for (i = 0; i < input.length; i++) {
      if (ctx.c === 128) { ctx.t += ctx.c; compress(ctx, false); ctx.c = 0; }
      ctx.b[ctx.c++] = input[i];
    }
    ctx.t += ctx.c;
    while (ctx.c < 128) ctx.b[ctx.c++] = 0;
    compress(ctx, true);
    var out = new Uint8Array(outlen);
    for (i = 0; i < outlen; i++) out[i] = ctx.h[i >> 2] >> (8 * (i & 3));
    return out;
  }

  // ---- polkadot identicon ----
  var S = 64, C = S / 2, Z = S / 64 * 5;
  var SCHEMES = [
    { colors: [0, 28, 0, 0, 28, 0, 0, 28, 0, 0, 28, 0, 0, 28, 0, 0, 28, 0, 1], freq: 1 },
    { colors: [0, 1, 3, 2, 4, 3, 0, 1, 3, 2, 4, 3, 0, 1, 3, 2, 4, 3, 5], freq: 20 },
    { colors: [1, 2, 3, 1, 2, 4, 5, 5, 4, 1, 2, 3, 1, 2, 4, 5, 5, 4, 0], freq: 16 },
    { colors: [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 3], freq: 32 },
    { colors: [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 6], freq: 32 },
    { colors: [0, 1, 2, 3, 4, 5, 3, 4, 2, 0, 1, 6, 7, 8, 9, 7, 8, 6, 10], freq: 128 },
    { colors: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 8, 6, 7, 5, 3, 4, 2, 11], freq: 128 }
  ];
  var TOTAL = SCHEMES.map(function (s) { return s.freq; }).reduce(function (a, b) { return a + b; });
  var zeroHash = null;

  function rotation(six) {
    var r = six ? (C / 8 * 5) : (C / 4 * 3);
    return { r: r, rroot3o2: r * Math.sqrt(3) / 2, ro2: r / 2, rroot3o4: r * Math.sqrt(3) / 4, ro4: r / 4, r3o4: r * 3 / 4 };
  }
  function circleXY(six) {
    var q = rotation(six), r = q.r, r3o4 = q.r3o4, ro2 = q.ro2, ro4 = q.ro4, a = q.rroot3o2, b = q.rroot3o4;
    return [
      [C, C - r], [C, C - ro2], [C - b, C - r3o4], [C - a, C - ro2], [C - b, C - ro4],
      [C - a, C], [C - a, C + ro2], [C - b, C + ro4], [C - b, C + r3o4], [C, C + r],
      [C, C + ro2], [C + b, C + r3o4], [C + a, C + ro2], [C + b, C + ro4], [C + a, C],
      [C + a, C - ro2], [C + b, C - ro4], [C + b, C - r3o4], [C, C]
    ];
  }
  function findScheme(d) {
    var cum = 0;
    for (var i = 0; i < SCHEMES.length; i++) { cum += SCHEMES[i].freq; if (d < cum) return SCHEMES[i]; }
    return SCHEMES[0];
  }
  // ---- base58 + SS58 ----
  var B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  function b58encode(bytes) {
    var digits = [0], i, j;
    for (i = 0; i < bytes.length; i++) {
      var carry = bytes[i];
      for (j = 0; j < digits.length; j++) { carry += digits[j] << 8; digits[j] = carry % 58; carry = (carry / 58) | 0; }
      while (carry > 0) { digits.push(carry % 58); carry = (carry / 58) | 0; }
    }
    var str = '';
    for (var k = 0; k < bytes.length && bytes[k] === 0; k++) str += '1';
    for (var q = digits.length - 1; q >= 0; q--) str += B58[digits[q]];
    return str;
  }
  function b58decode(str) {
    var bytes = [0], i, j;
    for (i = 0; i < str.length; i++) {
      var value = B58.indexOf(str[i]);
      if (value < 0) throw new Error('bad base58');
      var carry = value;
      for (j = 0; j < bytes.length; j++) { carry += bytes[j] * 58; bytes[j] = carry & 0xff; carry >>= 8; }
      while (carry > 0) { bytes.push(carry & 0xff); carry >>= 8; }
    }
    for (var k = 0; k < str.length && str[k] === '1'; k++) bytes.push(0);
    return new Uint8Array(bytes.reverse());
  }
  function ss58Encode(pub, prefix) {
    prefix = prefix || 0;
    var payload = new Uint8Array(33); payload[0] = prefix & 0x3f; payload.set(pub.slice(0, 32), 1);
    var pre = new TextEncoder().encode('SS58PRE');
    var input = new Uint8Array(pre.length + payload.length); input.set(pre, 0); input.set(payload, pre.length);
    var h = blake2b(input, 64);
    var full = new Uint8Array(35); full.set(payload, 0); full[33] = h[0]; full[34] = h[1];
    return b58encode(full);
  }
  function seedToPubkey(s) {
    if (typeof s === 'string' && /^[1-9A-HJ-NP-Za-km-z]{44,}$/.test(s)) {
      try { var b = b58decode(s); if (b.length >= 34) return b.slice(1, 33); } catch (e) { /* not an address */ }
    }
    return blake2b(new TextEncoder().encode(String(s)), 32);
  }
  function addressToId(seed) {
    if (!zeroHash) zeroHash = blake2b(new Uint8Array(32), 64);
    var h = blake2b(seedToPubkey(seed), 64);
    var out = new Uint8Array(64);
    for (var i = 0; i < 64; i++) out[i] = (h[i] + 256 - zeroHash[i]) % 256;
    return out;
  }
  function getColors(seed) {
    var id = addressToId(seed);
    var d = Math.floor((id[30] + id[31] * 256) % TOTAL);
    var rot = (id[28] % 6) * 3;
    var sat = (Math.floor(id[29] * 70 / 256 + 26) % 80) + 30;
    var scheme = findScheme(d);
    var palette = Array.from(id).map(function (x, i) {
      var bb = (x + (i % 28) * 58) % 256;
      if (bb === 0) return '#444';
      if (bb === 255) return 'transparent';
      var h = Math.floor(bb % 64 * 360 / 64);
      var l = [53, 15, 35, 75][Math.floor(bb / 64)];
      return 'hsl(' + h + ',' + sat + '%,' + l + '%)';
    });
    return scheme.colors.map(function (_, i) {
      return palette[scheme.colors[i < 18 ? (i + rot) % 18 : 18]];
    });
  }

  window.nsPolkadotIcon = function (seed, size) {
    size = size || 64;
    var xy = circleXY(false);
    var colors;
    try { colors = getColors(seed); } catch (e) { colors = new Array(xy.length).fill('#ddd'); }
    var body = '<circle cx="' + C + '" cy="' + C + '" r="' + C + '" fill="#eee"/>';
    for (var i = 0; i < xy.length; i++) {
      body += '<circle cx="' + xy[i][0].toFixed(2) + '" cy="' + xy[i][1].toFixed(2) + '" r="' + Z.toFixed(2) + '" fill="' + colors[i] + '"/>';
    }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="' + size + '" height="' + size + '">' + body + '</svg>';
    return 'data:image/svg+xml;base64,' + btoa(svg);
  };

  // Deterministic, valid SS58 address from a seed (prefix: 0=Polkadot, 2=Kusama, 42=generic).
  window.nsAddress = function (seed, prefix) {
    return ss58Encode(blake2b(new TextEncoder().encode(String(seed)), 32), prefix || 0);
  };
  // Truncate an address like the app's short variant.
  window.nsShort = function (addr, a, b) {
    a = a || 6; b = b || 6;
    if (!addr || addr.length <= a + b + 1) return addr || '';
    return addr.slice(0, a) + '…' + addr.slice(addr.length - b);
  };
})();
