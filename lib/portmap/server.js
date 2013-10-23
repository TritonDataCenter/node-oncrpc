// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');

var RpcServer = require('../server').RpcServer;

var PortmapGetPortCall = require('./get_port_call').PortmapGetPortCall;
var PortmapGetPortReply = require('./get_port_reply').PortmapGetPortReply;
var PortmapDumpReply = require('./dump_reply').PortmapDumpReply;



///--- Globals

var slice = Function.prototype.call.bind(Array.prototype.slice);



///--- API

function PortmapServer(opts) {
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

    RpcServer.call(this, _opts);
}
util.inherits(PortmapServer, RpcServer);


PortmapServer.prototype.dump = function dump() {
    var cfg = {
        name: 'dump',
        procedure: 4,
        reply: PortmapDumpReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};


PortmapServer.prototype.get_port = function get_port() {
    var cfg = {
        name: 'get_port',
        procedure: 3,
        call: PortmapGetPortCall,
        reply: PortmapGetPortReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};



PortmapServer.prototype.start = function start(host, cb) {
    var args = slice(arguments);
    args.unshift(111);
    this.listen.apply(this, args);
};



///--- Exports

module.exports = {
    PortmapServer: PortmapServer,
    createPortmapServer: function createPortmapServer(opts) {
        return (new PortmapServer(opts));
    }
};
