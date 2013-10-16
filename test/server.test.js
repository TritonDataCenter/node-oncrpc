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
        streams: [
            {
                path: process.env.LOG_FILE || '/dev/null'
            }
        ]
    }));
}



///--- API

function writeHead() {
    var len = 4 + rpc.XDR.byteLength(this.bar);
    var xdr = this._serialize(len);

    xdr.writeInt(this.foo);
    xdr.writeString(this.bar);

    this.write(xdr.buffer());
}


function _transform(chunk, enc, cb) {
    if (this.incoming) {
        var xdr = new rpc.XDR(chunk);
        this.foo = xdr.readInt();
        this.bar = xdr.readString();
    } else {
        this.push(chunk);
    }

    cb();
}


function TestCall(opts) {
    rpc.RpcCall.call(this, opts);

    this.foo = null;
    this.bar = null;
}
util.inherits(TestCall, rpc.RpcCall);


TestCall.prototype.writeHead = writeHead;
TestCall.prototype._transform = _transform;


function TestReply(opts) {
    rpc.RpcReply.call(this, opts);

    this.foo = null;
    this.bar = null;
}
util.inherits(TestReply, rpc.RpcReply);


TestReply.prototype.writeHead = writeHead;
TestReply.prototype._transform = _transform;


function TestServer(opts) {
    assert.object(opts, 'options');
    if (opts.log) {
        var l = opts.log;
        delete opts.log;
    }

    var _opts = clone(opts);
    _opts.log = opts.log = l;
    _opts.name = 'test';
    _opts.program = 100111;
    _opts.version = 1;

    rpc.RpcServer.call(this, _opts);
}
util.inherits(TestServer, rpc.RpcServer);


TestServer.prototype.echo = function test_srv_echo() {
    var args = Array.prototype.slice.apply(arguments);
    assert.arrayOfFunc(args);

    args.unshift({
        name: 'test_rpc',
        procedure: 1,
        call: TestCall,
        reply: TestReply
    });

    this._rpc.apply(this, args);

    return (this);
};


function TestClient(opts) {
    assert.object(opts, 'options');
    if (opts.log) {
        var l = opts.log;
        delete opts.log;
    }

    var _opts = clone(opts);
    _opts.log = opts.log = l;
    _opts.name = 'test';
    _opts.program = 100111;
    _opts.version = 1;

    rpc.RpcClient.call(this, _opts);

}
util.inherits(TestClient, rpc.RpcClient);


TestClient.prototype.echo = function client_test_echo(opts, cb) {
    assert.object(opts, 'options');
    assert.number(opts.foo, 'options.foo');
    assert.string(opts.bar, 'options.bar');
    assert.func(cb, 'callback');

    cb = once(cb);

    var call = new TestCall({
        incoming: false,
        proc: 1
    });

    call.foo = opts.foo;
    call.bar = opts.bar;

    this._rpc(call, TestReply, function (err, reply) {
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
};



///--- Helpers

function setup(t, cb) {
    var server = new TestServer({
        log: logger('RpcTestServer')
    });

    server.on('uncaughtException', function (req, res, err) {
        t.fail(err);
    });

    server.echo(function one(req, res, next) {
        t.ok(req instanceof TestCall);
        t.ok(res instanceof TestReply);
        t.ok(req.foo);
        t.ok(req.bar);
        next();
    }, function two(req, res, next) {
        res.foo = req.foo;
        res.bar = req.bar;

        res.writeHead();
        res.end();

        next();
    });

    server.listen(function () {
        var addr = server.address();

        var client = new TestClient({
            log: logger('RpcTestClient'),
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

test('echo', function (t) {
    setup(t, function (client) {
        var args = {
            foo: 123,
            bar: 'hello, world'
        };
        client.echo(args, function (err, reply) {
            t.ifError(err);
            t.ok(reply);
            t.ok(reply instanceof TestReply);
            t.equal(reply.foo, args.foo);
            t.equal(reply.bar, args.bar);
            t.end();
        });
    });
});


test('rpc version mismatch', function (t) {
    // This is dirty...
    // Hacked up portmap dump call with rpcvers=1
    /* JSSTYLED */
    var b = new Buffer('8000002899fff32a0000000000000001000186a0000000020000000400000000000000000000000000000000',
                       'hex');

    setup(t, function (client) {
        client.messages[0x99fff32a] = {
            cb: function (err, msg) {
                t.ok(err);
                t.ok(err instanceof rpc.RpcMismatchError);
                t.equal(err.mismatch_info.low, 2);
                t.equal(err.mismatch_info.high, 2);
                t.ok(msg);
                t.end();
            }
        };
        client.conn.write(b);
    });
});
