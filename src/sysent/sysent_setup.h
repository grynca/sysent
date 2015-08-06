#ifndef SYSENT_SETUP_H
#define SYSENT_SETUP_H

#include "types/Type.h"

// provide entity classes here
#include "sysent_setup/entities.h"

#include "types/Entity.h"
#include "types/System.h"

#include "defs.h"

// provide system classes here
#include "sysent_setup/systems.h"


namespace grynca {
    typedef TypesPack<SYSTEM_TYPES()> SystemTypes;
}


#endif //SYSENT_SETUP_H
