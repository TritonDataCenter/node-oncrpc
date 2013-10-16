// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var assert = require('assert-plus');



///--- API

function parseAuth(xdr) {
    assert.object(xdr, 'xdr');

    var msg = {};
    var type = xdr.readInt();
    var len = xdr.readInt();

    switch (type) {
    case 0: // null auth
        msg.type = 'null';
        // length is normally 0 for null auth, but that's not required
        xdr.xdr_offset += len;
        break;

    case 1: // unix
        msg.type = 'unix';
        msg.stamp = xdr.readInt();
        msg.machinename = xdr.readString();
        msg.uid = xdr.readInt();
        msg.gid = xdr.readInt();
        msg.gids = xdr.readIntArray();
        break;

    case 2: // TODO
    case 3: // TODO
    default:
        throw new Error('invalid auth type: ' + type);
    }

    return (msg);
}



///--- Exports

module.exports = {
    parse: parseAuth
};
