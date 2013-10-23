// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');
var WError = require('verror').WError;

var RpcMessage = require('../message').RpcMessage;



///--- Globals

var msg_serialize = RpcMessage.prototype.__serialize;



///--- API

function RpcError(cause, msg) {
    var off = 0;
    if (cause instanceof Error)
        off = 1;

    var args = Array.prototype.slice.call(arguments, off);
    args.unshift({
        cause: off ? cause : undefined,
        ctor: RpcError
    });
    WError.apply(this, args);

    this.type = 1; // reply
}
RpcError.prototype.name = 'RpcError';
util.inherits(RpcError, WError);


RpcError.prototype._serialize = function _serialize(sz) {
    var xdr = this.__serialize(16, sz);

    xdr.writeInt(0); // reply_stat: accepted
    xdr.writeDouble(0x00000000); // verifier
    xdr.writeInt(0); // accept_stat: ok

    return (xdr);
};


RpcError.prototype.__serialize = function __serialize(len, extra) {
    assert.ok(this.xid, 'xid was not set');

    return (msg_serialize.call(this, len, extra));
};


RpcError.prototype.toBuffer = function toBuffer() {
    var xdr = this._serialize();
    return (xdr.buffer());
};



///--- Exports

module.exports = {
    RpcError: RpcError
};
