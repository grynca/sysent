#ifndef ENTITYMANAGER_H
#define ENTITYMANAGER_H

#include "Entity.h"
namespace grynca {

    template <typename EntityTypes>
    class EntityManager : public ManagerVersioned<Entity<EntityTypes> > {
    public:
        EntityManager(uint32_t initial_reserve = 10000) {
            ManagerVersioned<Entity<EntityTypes> >::reserveSpaceForItems(initial_reserve);
        }
    };
}

#endif //ENTITYMANAGER_H
