// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var test = require('tap').test;

var rpc = require('../lib');



///--- Tests

test('read byte', function (t) {
    var xdr = new rpc.XDR(new Buffer([0, 10, 20, 30]));
    t.ok(xdr);
    for (var i = 0; i < 4; i++)
        t.equal(xdr.readByte(), i * 10);

    try {
        xdr.readInt();
        t.fail('past end of buffer');
    } catch (e) {
        t.ok(e);
    }

    t.equal(0, xdr.remain());
    t.end();
});


test('read integer', function (t) {
    var xdr = new rpc.XDR(new Buffer([0, 0, 0, 30]));
    t.ok(xdr);
    t.equal(xdr.readInt(), 30);
    t.equal(0, xdr.remain());
    t.end();
});


test('read boolean', function (t) {
    var xdr = new rpc.XDR(new Buffer([0, 0, 0, 1]));
    t.ok(xdr);
    t.ok(xdr.readBool());
    t.equal(0, xdr.remain());

    xdr = new rpc.XDR(new Buffer([0, 0, 0, 0]));
    t.ok(!xdr.readBool());
    t.equal(0, xdr.remain());
    t.end();
});


test('read int array', function (t) {
    var xdr = new rpc.XDR(new Buffer([
        0, 0, 0, 2,
        0, 0, 0, 4,
        0, 0, 0, 8
    ]));
    t.ok(xdr);
    var arr = xdr.readIntArray();
    t.ok(arr);
    t.equal(arr.length, 2);
    t.equal(arr[0], 4);
    t.equal(arr[1], 8);
    t.equal(0, xdr.remain());
    t.end();
});


test('read raw', function (t) {
    var b = new Buffer(12);
    var i;
    for (i = 0; i < 12; i++)
        b[i] = (i + 1);

    var xdr = new rpc.XDR(b);
    t.ok(xdr);

    xdr.readByte();
    var b2 = xdr.readRaw(5);
    t.ok(b2);
    t.equal(xdr.remain(), 6);
    for (i = 0; i < 5; i++)
        t.equal(b2[i], (i + 2));

    t.end();
});


test('read string', function (t) {
    var str = 'hello, world!';
    var slen = Buffer.byteLength(str);
    var r = (slen % 4 === 0 ? 0 : (4 - (slen % 4)));
    var b = new Buffer(4 + slen + r);
    b.writeUInt32BE(slen, 0);
    b.write(str, 4);

    var xdr = new rpc.XDR(b);
    t.ok(xdr);
    var str2 = xdr.readString();
    t.equal(str, str2);
    t.equal(0, xdr.remain());
    t.end();
});


test('write byte', function (t) {
    var LEN = 4;
    var b;
    var i;
    var xdr = new rpc.XDR(new Buffer(LEN));

    t.ok(xdr);

    for (i = 0; i < LEN; i++)
        t.equal(xdr.writeByte(i * 10));

    xdr.rewind();
    b = xdr.slice();
    t.ok(b);

    for (i = 0; i < LEN; i++)
        t.equal((i * 10), b[i]);

    t.end();
});


test('write integer', function (t) {
    var xdr = new rpc.XDR(new Buffer(4));
    t.ok(xdr);

    xdr.writeInt(77);
    xdr.rewind();
    t.equal(xdr.slice().readUInt32BE(0), 77);
    t.end();
});


test('write boolean', function (t) {
    var xdr = new rpc.XDR(new Buffer(4));
    t.ok(xdr);

    xdr.writeBool(true);
    xdr.rewind();
    t.equal(xdr.slice().readUInt32BE(0), 0x0001);
    xdr.writeBool(false);
    xdr.rewind();
    t.equal(xdr.slice().readUInt32BE(0), 0x0000);
    t.end();
});


test('write string', function (t) {
    var STR = 'hello, world!';
    t.equal(rpc.XDR.byteLength(STR), 20);
    function newBuf() {
        var _b = new Buffer(rpc.XDR.byteLength(STR));
        _b.fill(0xff);
        return (_b);
    }

    var xdr = new rpc.XDR(newBuf());
    t.ok(xdr);

    xdr.writeString(STR);
    t.equal(xdr.remain(), 0);
    xdr.rewind();

    t.equal(xdr.readString(), STR);
    xdr.rewind();

    var b = xdr.slice();
    var off = 0;

    t.equal(b.readUInt32BE(off), STR.length);
    off += 4;
    t.equal(b.toString('ascii', off, off + STR.length), STR);
    off += STR.length;
    t.equal(b.slice(off).length, (4 - (STR.length % 4)));
    t.end();
});


test('write uuid', function (t) {
    var STR = '5471ffae-fe07-4656-a4c3-db206d852342';
    t.equal(rpc.XDR.byteLength(STR), 40);
    function newBuf() {
        var _b = new Buffer(rpc.XDR.byteLength(STR));
        _b.fill(0xff);
        return (_b);
    }

    var xdr = new rpc.XDR(newBuf());
    t.ok(xdr);

    xdr.writeString(STR);
    t.equal(xdr.remain(), 0);
    xdr.rewind();

    t.equal(xdr.readString(), STR);
    xdr.rewind();

    var b = xdr.slice();
    var off = 0;

    t.equal(b.readUInt32BE(off), STR.length);
    off += 4;
    t.equal(b.toString('ascii', off, off + STR.length), STR);
    off += STR.length;
    t.equal(b.slice(off).length, 0);
    t.end();
});



test('write uint (that is actually negative)', function (t) {
    var xdr = new rpc.XDR(new Buffer(4));
    var i = -2; // mac's nobody user
    xdr.writeInt(i);
    xdr.rewind();
    t.equal(xdr.readInt() >> 0, i);
    t.end();
});


test('double', function (t) {
    var xdr = new rpc.XDR(new Buffer(8));
    var num = 1226;

    xdr.writeDouble(num);
    xdr.rewind();
    t.equal(xdr.readDouble(), num);

    var b = xdr.buffer();
    for (var i = 0; i < 6; i++)
        t.equal(b[i], 0x00);
    t.equal(b[6], 0x04);
    t.equal(b[7], 0xca);

    t.end();
});
