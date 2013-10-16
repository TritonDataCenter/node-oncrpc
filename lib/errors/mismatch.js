// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');

var RpcError = require('./error').RpcError;
var XDR = require('../xdr').XDR;



///--- API

function RpcMismatchError(cause, msg) {
    RpcError.apply(this, arguments);

    this.mismatch_info = {
        low: 2,
        high: 2
    };
}
RpcMismatchError.prototype.name = 'RpcMismatchError';
util.inherits(RpcMismatchError, RpcError);


RpcMismatchError.prototype._serialize = function _serialize() {
    var xdr = this.__serialize(16);

    xdr.writeInt(1); // reply_stat: rejected
    xdr.writeInt(0); // reject_stat: rpc mismatch
    xdr.writeInt(this.mismatch_info.low); // low: 2
    xdr.writeInt(this.mismatch_info.high); // high: 2

    return (xdr);
};



///--- Exports

module.exports = {
    RpcMismatchError: RpcMismatchError
};
