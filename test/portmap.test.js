// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var fs = require('fs');
var util = require('util');

var assert = require('assert-plus');
var bunyan = require('bunyan');
var clone = require('clone');
var once = require('once');
var test = require('tap').test;

var rpc = require('../lib');



///--- Helpers

function logger(name) {
    return (bunyan.createLogger({
        name: name,
        level: process.env.LOG_LEVEL || 'info',
        stream: process.stderr
    }));
}



///--- Helpers

function setup(t, cb) {
    var server = rpc.createPortmapServer({
        log: logger('RpcTestServer')
    });

    server.on('uncaughtException', function (req, res, err) {
        console.error(err.stack);
        process.exit(1);
    });

    server.set(function (req, res, next) {
        res.res = 1;
        res.send();
        next();
    });

    server.dump(function (req, res, next) {
        res.addMapping({
            name: 'portmap',
            prog: 100000,
            vers: 2,
            prot: 6,
            port: 123
        });

        res.send();
        next();
    });

    server.get_port(function (req, res, next) {
        res.port = 123;
        res.send();
        next();
    });

    server.listen(function () {
        var addr = server.address();

        var client = rpc.createPortmapClient({
            log: logger('PortmapClient'),
            url: util.format('tcp://%s:%d', addr.address, addr.port)
        });

        client.once('connect', function () {
            t._end = t.end.bind(t);
            t.end = function () {
                client.close(function () {
                    server.close(function () {
                        t._end();
                    });
                });
            };
            cb(client, server);
        });
    });
}



///--- Tests

test('dump', function (t) {
    setup(t, function (client) {
        client.dump(function (err, reply) {
            t.ifError(err);
            t.ok(reply);
            t.ok(reply.mappings);
            reply.mappings = reply.mappings || [];
            t.equal(reply.mappings.length, 1);
            if (reply.mappings.length) {
                var m = reply.mappings[0];
                t.equal(m.prog, 100000);
                t.equal(m.vers, 2);
                t.equal(m.port, 123);
                t.equal(m.prot, 6);
            }
            t.end();
        });
    });
});


test('set', function (t) {
    setup(t, function (client) {
        var opts = {
            prog: 100005,
            vers: 3,
            prot: 6,
            port: 1892
        };
        client.set(opts, function (err, reply) {
            t.ifError(err);
            t.ok(reply);
            t.equal(reply.res, 1);
            t.end();
        });
    });
});


test('get_port', function (t) {
    setup(t, function (client) {
        var opts = {
            prog: 100000,
            vers: 2,
            prot: 6
        };
        client.get_port(opts, function (err, reply) {
            t.ifError(err);
            t.ok(reply);
            t.equal(reply.port, 123);
            t.end();
        });
    });
});
