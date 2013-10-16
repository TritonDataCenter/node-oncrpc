// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');

var RpcCall = require('../call').RpcCall;
var XDR = require('../xdr').XDR;



///--- API

function PortmapGetPortCall(opts) {
    RpcCall.call(this, opts);

    this.mapping = {
        prog: 0,
        vers: 0,
        prot: 0
    };
    this._rpc_portmap_get_port_call = true; // MDB
}
util.inherits(PortmapGetPortCall, RpcCall);


PortmapGetPortCall.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);
        this.mapping.prog = xdr.readInt();
        this.mapping.vers = xdr.readInt();
        this.mapping.prot = xdr.readInt();
    } else {
        this.push(chunk);
    }

    cb();
};


PortmapGetPortCall.prototype.writeHead = function writeHead() {
    var xdr = this._serialize(12);
    xdr.writeInt(this.mapping.prog);
    xdr.writeInt(this.mapping.vers);
    xdr.writeInt(this.mapping.prot);

    this.write(xdr.buffer());
};


PortmapGetPortCall.prototype.toString = function toString() {
    var fmt = '[object PortmapGetPortCall <xid=%d, mapping=%j>]';
    return (util.format(fmt, this.xid, this.mapping));
};



///--- Exports

module.exports = {
    PortmapGetPortCall: PortmapGetPortCall
};
