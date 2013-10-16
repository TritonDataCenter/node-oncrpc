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

function RpcProgramMismatchError() {
    RpcError.apply(this, arguments);

    this.mismatch_info = {
        low: 0,
        high: 0
    };
}
RpcProgramMismatchError.prototype.name = 'RpcProgramMismatchError';
util.inherits(RpcProgramMismatchError, RpcError);


RpcProgramMismatchError.prototype.setVersion = function setVersion(v) {
    assert.number(v, 'version');

    this.mismatch_info.low = v;
    this.mismatch_info.high = v;
};


RpcProgramMismatchError.prototype._serialize = function _serialize() {
    var xdr = this.__serialize(24);

    xdr.writeInt(0); // reply_stat: accepted
    xdr.writeDouble(0x00000000); // verifier
    xdr.writeInt(2); // accept_stat: prog_mismatch
    xdr.writeInt(this.mismatch_info.low);
    xdr.writeInt(this.mismatch_info.high);

    return (xdr);
};



///--- Exports

module.exports = {
    RpcProgramMismatchError: RpcProgramMismatchError
};
