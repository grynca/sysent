#ifndef ENTITYMANAGER_H
#define ENTITYMANAGER_H

#include "Entity.h"
namespace grynca {

    class EntityManager : public ManagerVersioned<Entity> {
    public:
        EntityManager(uint32_t initial_reserve = 10000) {
            reserveSpaceForItems(initial_reserve);
        }
    };
}

#endif //ENTITYMANAGER_H
