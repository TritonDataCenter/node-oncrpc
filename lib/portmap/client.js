// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');
var once = require('once');

var RpcCall = require('../call').RpcCall;
var RpcClient = require('../client').RpcClient;

var PortmapDumpReply = require('./dump_reply').PortmapDumpReply;
var PortmapGetPortCall = require('./get_port_call').PortmapGetPortCall;
var PortmapGetPortReply = require('./get_port_reply').PortmapGetPortReply;



///--- API

function PortmapClient(opts) {
    assert.object(opts, 'options');
    if (opts.log) {
        var l = opts.log;
        delete opts.log;
    }

    var _opts = clone(opts);
    _opts.log = opts.log = l;
    _opts.name = 'portmap';
    _opts.program = 100000;
    _opts.version = 2;

    RpcClient.call(this, _opts);
}
util.inherits(PortmapClient, RpcClient);


PortmapClient.prototype.dump = function dump(cb) {
    assert.func(cb, 'callback');

    cb = once(cb);

    var call = new RpcCall({
        incoming: false,
        proc: 4
    });

    this._rpc(call, PortmapDumpReply, function (err, reply) {
        if (err) {
            cb(err, reply);
            return;
        }

        reply.on('data', function (chunk) {});
        reply.once('error', cb);
        reply.once('end', function () {
            cb(null, reply);
        });
    });

    call.end();

    return (this);
};


PortmapClient.prototype.get_port = function get_port(opts, cb) {
    assert.object(opts, 'options');
    assert.number(opts.prog, 'options.prog');
    assert.number(opts.vers, 'options.vers');
    assert.number(opts.prot, 'options.prot');
    assert.func(cb, 'callback');

    cb = once(cb);

    var call = new PortmapGetPortCall({
        incoming: false,
        proc: 3
    });

    this._rpc(call, PortmapGetPortReply, function (err, reply) {
        if (err) {
            cb(err, reply);
            return;
        }

        reply.on('data', function (chunk) {});
        reply.once('error', cb);
        reply.once('end', function () {
            cb(null, reply);
        });
    });

    call.end();


    return (this);
};



///--- Exports

module.exports = {
    PortmapClient: PortmapClient,
    createPortmapClient: function createPortmapClient(opts) {
        return (new PortmapClient(opts));
    }
};
