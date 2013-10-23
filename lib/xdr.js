// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');



///--- API

/**
 * A set of helper functions for "serdes" on XDR datatypes.
 *
 * Really the purpose to this utility is to keep track of an offset
 * so upstack code is cleaner.
 *
 * For a full description, see: http://tools.ietf.org/html/rfc4506
 */
function XDR(buf) {
    if (buf)
        assert.ok(Buffer.isBuffer(buf), 'buffer is required');

    this.xdr_buffer = buf || null;
    this.xdr_offset = 0;
}

XDR.byteLength = function byteLength(arg) {
    var len = 0;
    if (typeof (arg) === 'string') {
        len = 4 + Buffer.byteLength(arg, 'ascii');
        len += 4 - (len % 4);
    } else if (Array.isArray(arg)) {
        assert.arrayOfNumber(arg, 'array');
        len = 4 + (4 * arg.length);
    } else {
        throw new TypeError(typeof (arg) + ' not supported');
    }

    return (len);
};


XDR.prototype.append = function append(buf) {
    assert.ok(Buffer.isBuffer(buf), 'buffer is required');

    if (this.xdr_buffer) {
        this.xdr_buffer = Buffer.concat(this.xdr_buffer, buf);
    } else {
        this.xdr_buffer = buf;
    }
};


XDR.prototype.buffer = function buffer() {
    return (this.xdr_buffer);
};


XDR.prototype.byteLength = function (str) {
    return (XDR.byteLength(str));
};


XDR.prototype.offset = function offset() {
    return (this.xdr_offset);
};


XDR.prototype.readBool = function readBool() {
    var tmp = this.readInt();
    return (tmp === 1 ? true : false);
};


XDR.prototype.readByte = function readByte() {
    return (this.xdr_buffer[this.xdr_offset++]);
};


XDR.prototype.readDouble = function readDouble() {
    var i = this.xdr_buffer.readDoubleBE(this.xdr_offset);
    this.xdr_offset += 8;

    return (i);
};


XDR.prototype.readInt = function readInt() {
    var i = this.xdr_buffer.readUInt32BE(this.xdr_offset);
    this.xdr_offset += 4;

    return (i);
};


XDR.prototype.readIntArray = function readIntArray() {
    var arr = [];
    var num = this.readInt();

    for (var i = 0; i < num; i++)
        arr.push(this.readInt());

    return (arr);
};


XDR.prototype.readString = function readString() {
    var len = this.readInt();

    var end = this.xdr_offset + len;
    var str = this.xdr_buffer.toString('ascii', this.xdr_offset, end);
    this.xdr_offset += len;

    // skip padding
    if (len % 4 !== 0)
        this.xdr_offset += (4 - (len % 4));

    return (str);
};


XDR.prototype.remain = function remain() {
    return (this.xdr_buffer.length - this.xdr_offset);
};


XDR.prototype.rewind = function rewind(off) {
    assert.optionalNumber(off, 'offset');
    this.xdr_offset = off || 0;
};


XDR.prototype.size = function size() {
    return (this.xdr_buffer.length);
};


XDR.prototype.slice = function slice(start, end) {
    assert.optionalNumber(start, 'start');
    assert.optionalNumber(end, 'end');

    return (this.xdr_buffer.slice(start || this.xdr_offset, end));
};


XDR.prototype.toString = function toString() {
    return (util.format('[object XDR <size=%d, offset=%d>]',
                        this.xdr_buffer ? this.xdr_buffer.length : 0,
                        this.xdr_offset));
};


XDR.prototype.writeByte = function writeByte(num) {
    assert.number(num, 'integer');

    this.xdr_buffer.writeUInt8(num, this.xdr_offset);
    this.xdr_offset += 1;
};


XDR.prototype.writeBool = function writeBool(val) {
    assert.bool(val, 'boolean');

    this.writeInt(val ? 1 : 0);
};


XDR.prototype.writeDouble = function writeDouble(num) {
    assert.number(num, 'integer');

    this.xdr_buffer.writeDoubleBE(num, this.xdr_offset);
    this.xdr_offset += 8;
};


XDR.prototype.writeInt = function writeInt(num) {
    assert.number(num, 'integer');

    this.xdr_buffer.writeUInt32BE(num, this.xdr_offset);
    this.xdr_offset += 4;
};


XDR.prototype.writeIntArray = function writeIntArray(arr) {
    assert.arrayOfNumber(arr, 'array');

    var self = this;

    this.writeInt(arr.length);
    arr.forEach(function (i) {
        self.writeInt(i);
    });
};


XDR.prototype.writeShort = function writeShort(num) {
    assert.number(num, 'integer');

    this.xdr_buffer.writeUInt16BE(num, this.xdr_offset);
    this.xdr_offset += 2;
};


XDR.prototype.writeString = function writeString(str) {
    assert.string(str, 'string');

    var len = Buffer.byteLength(str, 'ascii');
    var end = this.xdr_offset + len;

    this.writeInt(len);
    this.xdr_buffer.write(str, this.xdr_offset, end, 'ascii');
    this.xdr_offset += len;

    // padding
    for (var i = 0; i < (4 - (len % 4)); i++)
        this.writeByte(0);
};



///--- Exports

module.exports = {
    XDR: XDR
};
