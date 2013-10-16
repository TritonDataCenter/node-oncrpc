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

function RpcProcedureUnavailableError(cause, msg) {
    RpcError.apply(this, arguments);
}
RpcProcedureUnavailableError.prototype.name = 'RpcProcedureUnavailableError';
util.inherits(RpcProcedureUnavailableError, RpcError);


RpcProcedureUnavailableError.prototype._serialize = function _serialize() {
    var xdr = this.__serialize(16);

    xdr.writeInt(0); // reply_stat: accepted
    xdr.writeDouble(0x00000000); // verifier
    xdr.writeInt(3); // accept_stat: proc_unavailable

    return (xdr);
};



///--- Exports

module.exports = {
    RpcProcedureUnavailableError: RpcProcedureUnavailableError
};
