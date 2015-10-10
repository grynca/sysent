#ifndef SYSTEMMANAGER_H
#define SYSTEMMANAGER_H

#include "SystemManager_internal.h"
#include <cassert>
#include <string.h>

namespace grynca {

    // fw
    template<typename EntityTypes> class EntityManager;

    template <typename EntityTypes, typename SystemTypes>
    class SystemManager {
    public:
        SystemManager(EntityManager<EntityTypes>& entity_manager);

        template <typename ... InitArgs>
        void init(InitArgs&&... args);

        void *getSystem(uint32_t system_id);

        template<typename SystemType>
        SystemType &getSystem();

        void update(float dt);
    private:
        void updateSystem_(uint32_t system_id, float dt);

        EntityManager<EntityTypes>* entity_manager_;
        internal::SystemManagerHelper<EntityTypes, SystemTypes> helper_;


    };
}

#include "SystemManager.inl"
#endif //SYSTEMMANAGER_H
