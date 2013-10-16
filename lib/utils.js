// Copyright 2013 Joyent, Inc.  All rights reserved.
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.



///--- API

function is_bit_set(x, n) {
    var rc = false;
    if (x & (1<<n))
        rc = true;
    return (rc);
}


function set_bit(x, n) {
    return (x | 1<<n);
}


function unset_bit(x, n) {
    return (x & ~(1<<n));
}



///--- Helpers

module.exports = {
    is_bit_set: is_bit_set,
    set_bit: set_bit,
    unset_bit: unset_bit
};
