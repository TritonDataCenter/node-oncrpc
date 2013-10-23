// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var stream = require('stream');
var util = require('util');

var assert = require('assert-plus');

var XDR = require('./xdr').XDR;
var utils = require('./utils');



///--- Globals

var sprintf = util.format;



///--- API

function RpcMessage(opts) {
    assert.object(opts, 'options');
    assert.bool(opts.incoming, 'options.incoming');
    assert.optionalNumber(opts.type, 'options.type');
    assert.optionalNumber(opts.xid, 'options.xid');

    stream.Transform.call(this, opts);

    this.type = opts.type;
    this.xid = opts.xid;

    this.incoming = opts.incoming;

    this._rpc_wrote_head = false;

    this._rpc_message = true; // MDB
}
util.inherits(RpcMessage, stream.Transform);


RpcMessage.prototype.send = function send() {
    this.writeHead();
    this.end();
};


RpcMessage.prototype.writeHead = function writeHead(size) {
    assert.optionalNumber(size, 'size');

    if (this._rpc_wrote_head)
        throw new Error('writeHead: already called');

    var xdr = this._serialize(size || 0);
    this.write(xdr.buffer());
    this._rpc_wrote_head = true;

    return (xdr);
};


RpcMessage.prototype.__serialize = function __serialize(len, extra) {
    assert.number(len, 'length');
    assert.optionalNumber(extra, 'extra');

    len = len + (extra ? extra : 0);
    var buf = new Buffer(12 + len);
    var xdr = new XDR(buf);

    xdr.writeInt(8 + len);
    // TODO - support fragments
    buf[0] = utils.set_bit(buf[0], 7);

    xdr.writeInt(this.xid);
    xdr.writeInt(this.type);

    return (xdr);
};


RpcMessage.prototype._transform = function _transform(chunk, encoding, cb) {
    if (!Buffer.isBuffer(chunk))
        chunk = new Buffer(chunk, encoding);

    this.push(chunk);
    cb();
};


RpcMessage.prototype._flush = function _flush(cb) {
    cb();
};


RpcMessage.prototype.toString = function toString() {
    return (sprintf('[object %s <xid=%d>]', this.constructor.name, this.xid));
};




///--- Exports

module.exports = {
    RpcMessage: RpcMessage
};
