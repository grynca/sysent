#ifndef DEFS_H
#define DEFS_H

namespace grynca {

    enum EntityRoles {
#include "sysent_setup/entity_roles.def"
        //==========================
                erCount
    };

    typedef TypesPack<ENTITY_TYPES()> EntityTypes;

    namespace props {
#include "sysent_setup/entity_props.def"
    }
}

#endif //DEFS_H
