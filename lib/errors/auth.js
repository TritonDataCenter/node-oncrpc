// Copyright 2014 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');

var RpcError = require('./error').RpcError;
var XDR = require('../xdr').XDR;

var sprintf = util.format;


///--- API

function RpcAuthError(cause, msg) {
    RpcError.apply(this, arguments);

    this.auth_stat = 1; // BadCred
}
RpcAuthError.prototype.name = 'RpcAuthError';
util.inherits(RpcAuthError, RpcError);


RpcAuthError.prototype._serialize = function _serialize() {
    var xdr = this.__serialize(12);

    xdr.writeInt(1); // reply_stat: rejected
    xdr.writeInt(1); // reject_stat: auth error
    xdr.writeInt(this.auth_stat);

    return (xdr);
};


RpcAuthError.prototype.toString = function toString() {
    return (sprintf('RpcAuthError auth_stat=%d', this.auth_stat));
};


///--- Exports

module.exports = {
    RpcAuthError: RpcAuthError
};
