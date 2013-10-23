// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var bunyan = require('bunyan');

var rpc = require('../lib');


(function main() {
    var bunyan = require('bunyan');

    var log = bunyan.createLogger({
        name: 'portmapd',
        level: 'info',
        src: true,
        stream: process.stdout,
        serializers: rpc.serializers
    });

    var server = rpc.createPortmapServer({
        log: log
    });

    server.dump(function (req, res, next) {
        res.addMapping({
            name: 'portmap',
            prog: 100000,
            vers: 2,
            prot: 6,
            port: 111
        });
        res.addMapping({
            name: 'nfs',
            prog: 100003,
            vers: 3,
            prot: 6,
            port: 2049
        });
        res.addMapping({
            name: 'mount',
            prog: 100005,
            vers: 3,
            prot: 6,
            port: 1892
        });
        res.writeHead();
        res.end();
        next();
    });

    server.get_port(function (req, res, next) {
        if (req.mapping.prog === 100003) {
            res.port = 2049;
        } else if (req.mapping.prog === 100005) {
            res.port = 1892;
        }

        res.writeHead();
        res.end();
        next();
    });

    server.on('after', function (name, req, res) {
        log.info({
            rpc_call: req,
            rpc_reply: res
        }, '%s: handled', name);
    });

    server.start(function () {
        log.info('portmapd listening on %j', server.address());
    });
})();
