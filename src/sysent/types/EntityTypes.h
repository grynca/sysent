#ifndef ENTITYTYPES_H
#define ENTITYTYPES_H

// fw
namespace grynca { class Entity; }

// provide entity classes here
#include "sysent_setup/entities.h"

namespace grynca {
    typedef TypesPack<ENTITY_TYPES()> EntityTypes;
}

#endif //ENTITYTYPES_H
