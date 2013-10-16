// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var stream = require('stream');
var util = require('util');

var assert = require('assert-plus');
var once = require('once');

var RpcCall = require('./call').RpcCall;
var RpcReply = require('./reply').RpcReply;
var XDR = require('./xdr').XDR;
var utils = require('./utils');



///--- API

/**
 * RpcParser
 *
 * A Node.js Writable stream for parsing RPC messages; note this assumes that
 * messages are being fed in from a TCP stream only.
 *
 * This parser runs as a state machine, and parses as much as it can per
 * instance of (node) `write`.  When a full RpcCall/RpcReply is parsed, then the
 * message is emitted. Note each message must be an instance of stream.Writable
 * as this parser will continue to write data to each message until it sees
 * "end" (which is an RPC semantic indicating "last fragment"). At that point
 * the message is dropped from the internal table, and this moves on.
 *
 * Because this parser emits high-level JS objects, this is not an instance of
 * stream.Readable.  Instead consumers must listen for 'message'; each of those
 * messages is an instance of stream.Readable (but may not have data associated
 * with it!).
 *
 * For more information on RPC: http://tools.ietf.org/html/rfc1057
 */
function RpcParser(opts) {
    assert.optionalObject(opts, 'options');

    stream.Writable.call(this, opts);

    this._buffer = null;
    this.rpc_table = {}; // TODO - use this when fragments are supported

    this._rpc_parser = true; // MDB flag
}
util.inherits(RpcParser, stream.Writable);


RpcParser.prototype._write = function _write(chunk, encoding, cb) {
    var last_frag;
    var len;
    var msg;
    var self = this;
    var type;
    var xid;
    var xdr;

    cb = once(cb);

    if (!Buffer.isBuffer(chunk))
        chunk = new Buffer(chunk, encoding);

    // Previously we couldn't read the RPC message header
    if (this._buffer) {
        chunk = Buffer.concat([this._buffer, chunk]);
        this._buffer = null;
    }

    // Ensure we can at least read the header
    if (chunk.length < 12) {
        this._buffer = chunk;
        cb();
        return;
    }

    if ((last_frag = utils.is_bit_set(chunk[0], 7))) {
        chunk[0] = utils.unset_bit(chunk[0], 7);
        len = chunk.readUInt32BE(0, true);
        chunk[0] = utils.set_bit(chunk[0], 7);
    } else {
        // TODO - handle multiple message fragments
        // See RFC 1057 section 10
        assert.ok(last_frag, 'RPC record marking not supported ' +
                  util.inspect(chunk));
        len = chunk.readUInt32BE(0, true);
    }

    // Underflow
    if (chunk.length < (len + 4)) {
        this._buffer = chunk;
        cb();
        return;
    }

    // Overflow
    if (chunk.length > (len + 4))
        self.write(chunk.slice(len + 4));

    xdr = new XDR(chunk.slice(4, len + 4));
    xid = xdr.readInt();
    type = xdr.readInt();

    switch (type) {
    case 0:
        msg = new RpcCall({
            incoming: true,
            xid: xid
        });
        break;

    case 1:
        msg = new RpcReply({
            incoming: true,
            xid: xid
        });
        break;

    default:
        cb(new Error('parse error: invalid message type(' + type + ')'));
        return;
    }

    msg.write(xdr.slice());
    if (last_frag)
        msg.end();

    self.emit('message', msg);

    cb();
};


RpcParser.prototype.toString = function toString() {
    var fmt = '[object RpcParser <buffered_bytes=%d, inprogress=%j>]';
    var xids = Object.keys(this.rpc_table);
    var len = this.rpc_tmp_buffer ? this.rpc_tmp_buffer.length : 0;

    return (util.format(fmt, len, xids));
};



///--- Exports

module.exports = {
    RpcParser: RpcParser,

    create: function createParser(opts) {
        return (new RpcParser(opts));
    }
};
