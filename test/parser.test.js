// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var stream = require('stream');
var util = require('util');

var chunky = require('chunky');
var test = require('tap').test;

var rpc = require('../lib');



///--- Helpers

function rand() {
    var i = Math.floor(Math.random() * (Math.pow(2, 32) - 1));
    return (i);
}



// Stream is random, but pretty much guarantees over enough runs we'll hit
// both underflow and overflow in the parser
function RandomStream(opts) {
    stream.Transform.call(this, opts);
    this.buf = null;
}
util.inherits(RandomStream, stream.Transform);


RandomStream.prototype._transform = function _transform(chunk, encoding, cb) {
    if (!this.buf) {
        this.buf = chunk;
    } else {
        this.buf = Buffer.concat([this.buf, chunk]);
    }

    cb();
};


RandomStream.prototype._flush = function _flush(cb) {
    var self = this;

    chunky(this.buf).forEach(function (b) {
        self.push(b);
    });

    cb();
};



///--- Tests

test('parse null call once', function (t) {
    var call = new rpc.RpcCall({
        incoming: false,
        prog: 100000,
        proc: 4,
        vers: 2,
        xid: rand()
    });
    var parser = new rpc.RpcParser();

    parser.on('message', function (msg) {
        t.ok(msg, 'rpc message');
        t.equal(msg.type, 0, 'rpc call');
        t.equal(msg.xid, call.xid, 'xid');
        t.equal(msg.rpcvers, call.rpcvers, 'rpcvers');
        t.equal(msg.prog, call.prog, 'program');
        t.equal(msg.vers, call.vers, 'version');
        t.equal(msg.proc, call.proc, 'procedure');
        t.end();
    });

    call.pipe(parser);

    call.writeHead();
    call.end();
});


test('parse null call randomized', function (t) {
    var N = 100;
    var call = new rpc.RpcCall({
        incoming: false,
        prog: 100000,
        proc: 4,
        vers: 2,
        xid: rand()
    });
    var input = new RandomStream();
    var parser = new rpc.RpcParser();
    var seen = 0;

    parser.on('message', function (msg) {
        t.ok(msg, 'rpc message');
        t.equal(msg.type, 0, 'rpc call');
        t.equal(msg.xid, call.xid, 'xid');
        t.equal(msg.rpcvers, call.rpcvers, 'rpcvers');
        t.equal(msg.prog, call.prog, 'program');
        t.equal(msg.vers, call.vers, 'version');
        t.equal(msg.proc, call.proc, 'procedure');
        seen++;
    });

    parser.once('finish', function () {
        // Ghetto, but kicking a setTimeout makes all other things
        // run first
        setTimeout(function () {
            t.equal(seen, N + 1);
            t.end();
        }, 10);
    });

    input.pipe(parser);
    call.pipe(input);

    // Make sure we're hitting the overflow case
    var xdr = call.writeHead();
    for (var i = 0; i < N; i++)
        call.write(xdr.buffer());

    call.end();
});
