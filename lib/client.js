// Copyright 2014 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var EventEmitter = require('events').EventEmitter;
var net = require('net');
var mod_url = require('url');
var util = require('util');

var assert = require('assert-plus');
var once = require('once');

var errors = require('./errors');
var RpcParser = require('./parser').RpcParser;



///--- Globals

var sprintf = util.format;



///--- API

function RpcClient(opts) {
    assert.object(opts, 'options');
    assert.object(opts.log, 'options.log');
    assert.number(opts.program, 'options.program');
    assert.number(opts.version, 'options.version');
    assert.string(opts.url, 'options.url');

    EventEmitter.call(this, opts);

    var self = this;

    this.conn = null;
    this.log = opts.log.child({
        component: 'RpcClient',
        serializers: require('./bunyan').serializers
    });
    this.messages = {};
    this.program = opts.program;
    this.url = mod_url.parse(opts.url);
    this.version = opts.version;

    var ID = 0;
    this._next_xid = function () {
        if (++ID === (Math.pow(2, 32) - 1))
            ID = 0;
        return (ID);
    };
    this._rpc_client = true; // MDB ::findjsobjects flag

    this.conn = net.createConnection({
        port: this.url.port,
        host: this.url.hostname
    });

    this.conn.once('error', function onErr(e) {
        self.emit('error', e);
        return;
    });

    this.conn.once('connect', function onConnect() {
        var parser = new RpcParser({
            log: self.log
        });
        parser.on('message', function onRpcMessage(msg) {
            var cfg = self.messages[msg.xid];
            var res;

            if (!cfg) {
                self.emit('error', new Error('unsolicited RPC message'), msg);
                return;
            }

            if (cfg.reply) {
                res = new cfg.reply(msg);
                msg.pipe(res);
            } else {
                res = msg;
            }

            msg.once('end', function cleanupMessageTable() {
                if (self.messages[msg.xid])
                    delete self.messages[msg.xid];
            });

            var _cb = cfg.cb;
            var _err = null;
            if (msg.reply_stat === 0) {
                switch (msg.accept_stat) {
                case 0:
                    break;

                case 1:
                    _err = new errors.RpcProgramUnavailableError();
                    break;

                case 2:
                    _err = new errors.RpcProgramMismatchError();
                    _err.mismatch_info = msg.mismatch_info;
                    break;

                case 3:
                    _err = new errors.RpcProcedureUnavailableError();
                    break;

                case 4:
                    _err = new errors.RpcGarbageArgumentsError();
                    break;

                default:
                    _err = new errors.RpcError('invalid rpc.accept_stat: ' +
                                               msg.accept_stat);
                    break;
                }
            } else if (msg.reply_stat === 1) {
                if (msg.reject_stat === 0) {
                    _err = new errors.RpcMismatchError();
                    _err.mismatch_info = msg.mismatch_info;
                } else {
                    _err = new errors.RpcAuthError();
                    _err.auth_stat = msg.auth_stat;
                }
            }

            process.nextTick(function emitRpcReply() {
                if (_err) {
                    _cb(_err, msg);
                } else {
                    _cb(null, res, msg);
                }
            });
        });
        self.conn.pipe(parser);
        self.emit('connect');
    });

    this._rpc_client = true; // MDB
}
util.inherits(RpcClient, EventEmitter);


RpcClient.prototype.close = function close(cb) {
    if (cb)
        this.conn.once('close', cb);

    this.conn.end();
    this.conn.destroy();
};


RpcClient.prototype._rpc = function _rpc(call, reply, cb) {
    assert.object(call, 'RpcCall');
    assert.func(reply, 'RpcReply');
    assert.func(cb, 'callback');

    call.rpcvers = 2;
    call.prog = this.program;
    call.vers = this.version;
    call.xid = this._next_xid();

    this.messages[call.xid] = {
        reply: reply,
        cb: once(cb)
    };
    call.pipe(this.conn, {end: false});

    return (call.writeHead());
};


RpcClient.prototype.toString = function toString() {
    var fmt = '[object RpcClient <host=%s, port=%d>, program=%d, version=%d]';
    var u = this.url;
    return (sprintf(fmt, u.hostname, u.port, this.program, this.version));
};



///--- Exports

module.exports = {
    RpcClient: RpcClient,
    createClient: function createClient(opts) {
        return (new RpcClient(opts));
    }
};
