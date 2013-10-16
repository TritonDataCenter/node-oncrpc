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


PortmapServer.prototype.getPort = function getPort() {
    var cfg = {
        name: 'getport',
        procedure: 3,
        call: PortmapGetPortCall,
        reply: PortmapGetPortReply
    };
    this._mount(cfg, slice(arguments));

    return (this);
};



PortmapServer.prototype.start = function start(host, cb) {
    this.listen(111, host, cb);
};



///--- Exports

module.exports = {
    PortmapServer: PortmapServer,
    createServer: function createServer(opts) {
        return (new PortmapServer(opts));
    }
};



///--- Tests

// (function main() {
//     var bunyan = require('bunyan');

//     var log = bunyan.createLogger({
//         name: 'portmapd',
//         level: 'trace',
//         src: true,
//         stream: process.stdout,
//         serializers: require('../bunyan').serializers
//     });

//     var server = new PortmapServer({
//         log: log
//     });

//     server.dump(function dump(req, res, next) {
//         res.addMapping({
//             name: 'portmap',
//             prog: 100000,
//             vers: 2,
//             prot: 6,
//             port: 111
//         });
//         res.addMapping({
//             name: 'mount',
//             prog: 100005,
//             vers: 3,
//             prot: 6,
//             port: 1892
//         });
//         res.writeHead();
//         res.end();
//         next();
//     });

//     server.getPort(function dump(req, res, next) {
//         res.port = 1892;
//         res.writeHead();
//         res.end();
//         next();
//     });

//     server.on('after', function (name, req, res) {
//         log.info({
//             rpc_call: req,
//             rpc_reply: res
//         }, '%s: handled', name);
//     });

//     server.start(function () {
//         console.log('ready');
//     });
// })();
