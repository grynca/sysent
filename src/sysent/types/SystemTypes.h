#ifndef SYSTEMTYPES_H
#define SYSTEMTYPES_H

#include "types/Type.h"
// provide system classes here
#include "sysent_setup/systems.h"

namespace grynca {
    typedef TypesPack<SYSTEM_TYPES()> SystemTypes;
}

#endif //SYSTEMTYPES_H
