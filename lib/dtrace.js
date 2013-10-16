// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.



///--- Globals

var PROBES = {
        // server_name, procedure_name, id
        'rpc-start': ['char *', 'char *', 'int'],

        // server_name, procedure_name, handler_name, id
        'handler-start': ['char *', 'char *', 'char *', 'int'],

        // server_name, procedure_name, handler_name, id
        'handler-done': ['char *', 'char *', 'char *', 'int'],

        // server_name, route_name, id
        'rpc-done': ['char *', 'char *', 'int']
};
var PROVIDER;



///--- API

module.exports = function exportStaticProvider() {
    if (!PROVIDER) {
        try {
            var dtrace = require('dtrace-provider');
            PROVIDER = dtrace.createDTraceProvider('rpc');
        } catch (e) {
            PROVIDER = {
                fire: function () {},
                enable: function () {},
                addProbe: function () {
                    var p = {
                        fire: function () {}
                    };
                    return (p);
                },
                removeProbe: function () {},
                disable: function () {}
            };
        }

        PROVIDER._rpc_probes = {};

        Object.keys(PROBES).forEach(function (p) {
            var args = PROBES[p].splice(0);
            args.unshift(p);

            var probe = PROVIDER.addProbe.apply(PROVIDER, args);
            PROVIDER._rpc_probes[p] = probe;
        });

        PROVIDER.enable();

    }

    return (PROVIDER);
}();
