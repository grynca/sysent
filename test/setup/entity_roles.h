#ifndef ENTITYROLES_H
#define ENTITYROLES_H

#include <bitset>

namespace grynca {
    enum EntityRoles {
        erMovable = 0x01,
        erCollidable = 0x02,

//===========================
        erCount
    };

    typedef std::bitset<EntityRoles::erCount> RolesMask;
}

#endif //ENTITYROLES_H
