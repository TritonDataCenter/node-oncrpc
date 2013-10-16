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

_export(require('./auth'));
_export(require('./error'));
_export(require('./mismatch'));
_export(require('./garbage_args'));
_export(require('./prog_mismatch'));
_export(require('./prog_unavail'));
_export(require('./proc_unavail'));
