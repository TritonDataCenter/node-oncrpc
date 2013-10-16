// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.



///--- API


function serializeAuth(a) {
    var obj = null;
    if (a) {
        obj = {
        };
    }
    return (obj);
}


function serializeCall(c) {
    var obj = null;
    if (c) {
        obj = {
            xid: c.xid,
            rpcvers: c.rpcvers,
            prog: c.prog,
            vers: c.vers,
            proc: c.proc,
            rpc_auth: c.auth,
            rpc_verifier: c.verifier
        };
    }

    return (obj);
}



function serializeMessage(c) {
    var obj = null;
    if (c) {
        obj = {
            xid: c.xid
        };
    }

    return (obj);
}



///--- Exports

module.exports = {
    serializers: {
        rpc_call: serializeCall,
        rpc_message: serializeMessage,
        rpc_msg: serializeMessage,
        rpc_reply: serializeMessage,
        rpc_auth: serializeAuth,
        rpc_verifier: serializeAuth
    }
};
