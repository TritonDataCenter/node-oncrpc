// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');

var RpcReply = require('../reply').RpcReply;
var XDR = require('../xdr').XDR;



///--- API

function PortmapGetPortReply(opts) {
    RpcReply.call(this, opts);

    this.port = 0;

    this._rpc_portmap_get_port_reply = true; // MDB
}
util.inherits(PortmapGetPortReply, RpcReply);


PortmapGetPortReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);
        this.port = xdr.readInt();
    } else {
        this.push(chunk);
    }

    cb();
};



PortmapGetPortReply.prototype.writeHead = function writeHead() {
    var xdr = this._serialize(4);
    xdr.writeInt(this.port);

    this.write(xdr.buffer());
};


PortmapGetPortReply.prototype.toString = function toString() {
    var fmt = '[object PortmapGetPortReply <xid=%d, port=%d>]';
    return (util.format(fmt, this.xid, this.port));
};



///--- Exports

module.exports = {
    PortmapGetPortReply: PortmapGetPortReply
};
