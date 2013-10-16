// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var stream = require('stream');
var util = require('util');

var assert = require('assert-plus');
var once = require('once');

var auth = require('./auth');
var RpcMessage = require('./message').RpcMessage;
var XDR = require('./xdr').XDR;



///--- Globals

var sprintf = util.format;



///--- API

function RpcReply(opts) {
    RpcMessage.call(this, opts);

    this._buffer = null;
    this.rpc_reply_header_sent = false;
    this.type = 1;
}
util.inherits(RpcReply, RpcMessage);


RpcReply.prototype._serialize = function _serialize(size) {
    assert.optionalNumber(size, 'size');

    // 8 bytes for header, 8 for NULL verifier
    var xdr = this.__serialize(16, size);

    xdr.writeInt(0);               // reply_stat: accepted
    xdr.writeDouble(0x000000000);  // verifier (null)
    xdr.writeInt(0);               // accept_stat: ok

    return (xdr);
};


RpcReply.prototype._transform = function _transform(chunk, encoding, cb) {
    cb = once(cb);

    if (!Buffer.isBuffer(chunk))
        chunk = new Buffer(chunk, encoding);

    if (this.incoming) {
        if (this._buffer) {
            chunk = Buffer.concat(this._buffer, chunk);
            this._buffer = null;
        }

        if (chunk.length < 16) {
            this._buffer = chunk;
            return;
        }

        var xdr = new XDR(chunk);

        this.reply_stat = xdr.readInt();

        if (this.reply_stat === 0) { // ACCEPTED
            // TODO inspect length
            this.verifier = auth.parse(xdr);
            this.accept_stat = xdr.readInt();

            if (this.accept_stat === 0) {
                if (xdr.remain())
                    this.push(xdr.slice());
            } else if (this.accept_stat === 2) {
                this.mismatch_info = {
                    low: xdr.readInt(),
                    high: xdr.readInt()
                };
            }
            // otherwise "void"
        } else if (this.reply_stat === 1) { // DENIED
            this.reject_stat = xdr.readInt();
            if (this.reject_stat === 0) { // RPC_MISMATCH
                this.mismatch_info = {
                    low: xdr.readInt(),
                    high: xdr.readInt()
                };
            } else if (this.reject_stat === 1) { // AUTH_ERROR
                this.auth_stat = xdr.readInt();
            } else {
                cb(new Error('invalid reject_stat: ' + this.reject_stat));
                return;
            }
        } else {
            cb(new Error('invalid reply_stat: ' + this.reply_stat));
            return;
        }
    } else {
        this.push(chunk);
    }

    cb();
};



///--- Exports

module.exports = {
    RpcReply: RpcReply
};
