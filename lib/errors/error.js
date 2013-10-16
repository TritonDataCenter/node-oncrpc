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


RpcError.prototype.__serialize = function __serialize(len, no_alloc) {
    assert.ok(this.xid, 'xid was not set');

    return (msg_serialize.call(this, len, no_alloc));
};


RpcError.prototype.toBuffer = function toBuffer() {
    var xdr = this._serialize();
    return (xdr.buffer());
};



///--- Exports

module.exports = {
    RpcError: RpcError
};
