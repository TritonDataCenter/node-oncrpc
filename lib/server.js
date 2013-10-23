// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var domain = require('domain');
var net = require('net');
var util = require('util');

var assert = require('assert-plus');
var clone = require('clone');
var once = require('once');

var dtrace = require('./dtrace');
var errors = require('./errors');
var RpcCall = require('./call').RpcCall;
var RpcParser = require('./parser').RpcParser;
var RpcReply = require('./reply').RpcReply;



///--- Globals

var slice = Function.prototype.call.bind(Array.prototype.slice);
var sprintf = util.format;



///--- Private Methods
// "this" is bound to an RpcServer

function ifError(n) {
    function _ifError(err) {
        if (err) {
            err._rpc_next = n;
            throw err;
        }
    }

    return (_ifError);
}


function onConnection(c) {
    var log = this.log;
    var parser = new RpcParser({
        log: log
    });
    var self = this;

    c.on('error', function (err) {
        log.error(err, 'connection error occurred');
    });

    parser.on('message', function onRpcMessage(msg) {
        assert.ok(msg, 'parsed rpc object is null');

        var err;
        function return_error() {
            err.xid = msg.xid;
            c.write(err.toBuffer());
        }

        log.trace({
            rpc_call: msg
        }, 'call received');

        if (msg.rpcvers !== 2) {
            err = new errors.RpcMismatchError();
            return_error();
        } else if (msg.prog !== self.program) {
            err = new errors.RpcProgramUnavailableError();
            return_error();
        } else if (msg.vers !== self.version) {
            err = new errors.RpcProgramMismatchError();
            err.setVersion(self.version);
            return_error();
        } else if (!self.rpc_table[msg.proc]) {
            if (msg.proc === 0) { // NULL RPC handler
                msg.incoming = false;
                var _null = new RpcReply(msg);
                _null.pipe(c, {end: false});
                _null.writeHead();
                _null.end();
                msg.incoming = true;
            } else {
                err = new errors.RpcProcedureUnavailableError();
                return_error();
            }
        } else {
            var cfg = self.rpc_table[msg.proc];

            msg.incoming = false;
            var reply = new cfg.reply(msg);
            reply.pipe(c, {end: false});

            msg.incoming = true;
            var call;
            if (cfg.call) {
                call = new cfg.call(msg);
                msg.pipe(call);
            } else {
                call = msg;
            }

            call.connection = c;
            process.nextTick(function () {
                self.emit(cfg.name, call, reply);
            });
        }
    });

    c.pipe(parser);
}



///--- API


// An RPC service is identified by its RPC program number, version
// number, and the transport address where it may be reached.  The
// transport address, in turn, consists of a network address and a
// transport selector.  In the case of a service available over TCP/IP
// or UDP/IP, the network address will be an IP address, and the
// transport selector will be a TCP or UDP port number.

function RpcServer(opts) {
    assert.object(opts, 'options');
    assert.object(opts.log, 'options.log');
    assert.number(opts.program, 'options.program');
    assert.number(opts.version, 'options.version');

    net.Server.call(this, opts);


    this.log = opts.log.child({
        component: 'RpcServer',
        serializers: require('./bunyan').serializers
    });
    this.program = opts.program;
    this.rpc_table = {};
    this.version = opts.version;

    this.on('connection', onConnection.bind(this));
}
util.inherits(RpcServer, net.Server);


RpcServer.prototype._mount = function _mount(cfg, chain) {
    assert.object(cfg, 'config');
    assert.arrayOfFunc(chain);

    chain.unshift(cfg);
    this._rpc.apply(this, chain);
};

/**
 * Runs a series of handlers given an RPC procedure.
 *
 * var cfg = {
 *   procedure: 4,           // What RPC procedure
 *   reply: PortmapDumpReply // What Type of Reply instance to create
 * };
 * server._rpc(cfg, function (req, res, next) {
 *   res.addMapping({...}); // procedure specific
 *   res.writeHead();
 *   res.end();
 *   next();
 * });
 */
RpcServer.prototype._rpc = function _rpc(opts) {
    assert.object(opts, 'options');
    assert.string(opts.name, 'options.name');
    assert.number(opts.procedure, 'options.procedure');
    assert.optionalFunc(opts.call, 'options.call');
    assert.func(opts.reply, 'options.reply');

    var args = slice(arguments, 1);
    assert.arrayOfFunc(args, 'handler chain');

    var self = this;

    this.rpc_table[opts.procedure] = opts;
    this.on(opts.name, function onRpcCall(call, reply) {
        var log = self.log.child({
            procedure: opts.name,
            xid: call.xid
        }, true);

        call.log = log;
        reply.log = log;

        call._rpc_proc_name = opts.name;

        self._run(call, reply, args);
    });
};


RpcServer.prototype._run = function _run(req, res, chain) {
    var d;
    var err;
    var i = -1;
    var id = req.xid;
    var log = this.log;
    var self = this;

    function fire_rpc() {
        return ([
            self.name,
            req._rpc_proc_name,
            id
        ]);
    }

    function fire_handler() {
        return ([
            self.name,
            req._rpc_proc_name,
            id
        ]);
    }

    function next(arg) {
        var done = false;

        if (arg) {
            if (arg instanceof Error) {
                log.trace(arg, 'next(err=%s)', (arg.name || 'Error'));
                arg.xid = req.xid;
                err = arg;
                req.connection.write(err.toBuffer());
                done = true;
            }
        }

        if (arg === false)
            done = true;

        // Fire DTrace done for the previous handler.
        if ((i + 1) > 0 && chain[i] && !chain[i]._skip) {
            var _name = chain[i].name || ('handler-' + i);

            dtrace._rpc_probes['handler-done'].fire(function () {
                return ([
                    self.name,
                    req._rpc_proc_name,
                    _name,
                    id
                ]);
            });
        }

        // Run the next handler up
        if (!done && chain[++i]) {
            if (chain[i]._skip) {
                next();
                return;
            }

            dtrace._rpc_probes['handler-start'].fire(function () {
                return ([
                    self.name,
                    req._rpc_proc_name,
                    chain[i].name || ('handler-' + i),
                    id
                ]);
            });

            var n = once(next);
            n.ifError = ifError(n);
            chain[i].call(self, req, res, n);
            return;
        }

        dtrace._rpc_probes['rpc-done'].fire(fire_rpc);

        self.emit('after', req._rpc_proc_name, req, res, err);
    }

    var n1 = once(next);
    n1.ifError = ifError(n1);

    dtrace._rpc_probes['rpc-start'].fire(fire_rpc);

    d = domain.create();
    d.add(req);
    d.add(res);
    d.on('error', function onError(error) {
        if (error._rpc_next) {
            error._rpc_next(error);
        } else if (self.listeners('uncaughtException').length) {
            self.emit('uncaughtException', req, res, error);
        } else {
            req.connection.destroy();
        }
    });

    d.run(n1);
};


RpcServer.prototype.toString = function toString() {
    var fmt = '[object RpcServer <program=%d, version=%d>]';
    return (sprintf(fmt, this.rpc_program, this.rpc_version));
};


function createServer(opts) {
    return (new RpcServer(opts));
}


///--- Exports

module.exports = {
    RpcServer: RpcServer,
    createServer: createServer
};
