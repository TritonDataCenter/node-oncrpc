// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var test = require('tap').test;

var rpc = require('../lib');




///--- Tests

test('toString', function (t) {
    var msg = new rpc.RpcMessage({
        xid: 1234,
        size: 0,
        incoming: false
    });
    t.ok(msg);
    t.equal('[object RpcMessage <xid=1234>]', msg.toString());
    t.end();
});


test('parse call', function (t) {
    var msg = new rpc.RpcCall({
        xid: 1234,
        incoming: true
    });
    t.ok(msg);

    // Stubbed out PortmapDump call -- note we stripped off the length,
    // xid and type; "RpcParser" is expected to parse that
    /* JSSTYLED */
    var b = new Buffer('00000002000186a0000000020000000400000000000000000000000000000000',
                       'hex');
    msg.end(b);

    t.equal(msg.rpcvers, 2);   // rpcvers = 2
    t.equal(msg.prog, 100000); // portmap
    t.equal(msg.vers, 2);      // v2
    t.equal(msg.proc, 4);      // dump
    t.ok(msg.auth);
    t.equal(msg.auth.type, 'null');
    t.ok(msg.verifier);
    t.equal(msg.verifier.type, 'null');
    t.end();
});


test('parse reply', function (t) {
    var msg = new rpc.RpcReply({
        xid: 1234,
        incoming: true
    });
    t.ok(msg);

    // Stubbed out PortmapDump reply -- note we stripped off the length,
    // xid and type; "RpcParser" is expected to parse that
    /* JSSTYLED */
    var b = new Buffer('0000000000000000000000000000000000000001000186a000000002000000060000006f00000000',
                       'hex');
    msg.end(b);

    t.equal(msg.reply_stat, 0);
    t.ok(msg.verifier);
    t.equal(msg.verifier.type, 'null');
    t.equal(msg.accept_stat, 0);
    // Ignore the portmap dump specific portion
    t.end();
});
