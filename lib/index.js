// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.



///--- Helpers

function _export(obj) {
    Object.keys(obj).forEach(function (k) {
        module.exports[k] = obj[k];
    });
}



///--- Exports

module.exports = {};

_export(require('./bunyan'));
_export(require('./call'));
_export(require('./client'));
_export(require('./errors'));
_export(require('./message'));
_export(require('./parser'));
_export(require('./portmap'));
_export(require('./reply'));
_export(require('./server'));
_export(require('./xdr'));
