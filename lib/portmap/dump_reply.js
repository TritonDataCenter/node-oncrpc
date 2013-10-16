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



///--- Helpers

function calculate_buffer_length(arr) {
    return ((arr.length * 20) + 4);
}



///--- API

function PortmapDumpReply(opts) {
    RpcReply.call(this, opts);

    this.mappings = [];

    this._rpc_portmap_dump_reply = true; // MDB
}
util.inherits(PortmapDumpReply, RpcReply);


PortmapDumpReply.prototype.addMapping = function addMapping(opts, noClone) {
    assert.object(opts);
    assert.optionalString(opts.name, 'options.name');
    assert.number(opts.prog, 'options.prog');
    assert.number(opts.vers, 'options.vers');
    assert.number(opts.prot, 'options.prot');
    assert.number(opts.port, 'options.port');
    assert.optionalBool(noClone, 'noClone');

    this.mappings.push(noClone ? opts : clone(opts));
};


PortmapDumpReply.prototype._transform = function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new XDR(chunk);

        while (xdr.readBool()) {
            this.addMapping({
                prog: xdr.readInt(),
                vers: xdr.readInt(),
                prot: xdr.readInt(),
                port: xdr.readInt()
            }, true);
        }
    } else {
        this.push(chunk);
    }

    cb();
};



PortmapDumpReply.prototype.writeHead = function writeHead() {
    var len = calculate_buffer_length(this.mappings);
    var xdr = this._serialize(len);

    this.mappings.forEach(function (p) {
        xdr.writeBool(true);
        xdr.writeInt(p.prog);
        xdr.writeInt(p.vers);
        xdr.writeInt(p.prot);
        xdr.writeInt(p.port);
    });
    xdr.writeBool(false);

    this.write(xdr.buffer());
};


PortmapDumpReply.prototype.toString = function toString() {
    var fmt = '[object PortmapDumpReply <xid=%d, mappings=%j>]';
    return (util.format(fmt, this.xid, this.mappings));
};



///--- Exports

module.exports = {
    PortmapDumpReply: PortmapDumpReply
};
