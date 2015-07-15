#ifndef SYSTEMMANAGER_H
#define SYSTEMMANAGER_H

#include "../setup/entity_types.h"
#include "../setup/system_types.h"

#include "SystemManager_internal.h"
#include <cassert>
#include <string.h>

namespace grynca {

    // fw
    class EntityManager;

    class SystemManager {
    public:
        SystemManager();


        System *getSystem(uint32_t system_id);

        template<typename SystemType>
        SystemType &getSystem();

        void updateSystem(uint32_t system_id, EntityManager& entity_manager, double dt);

        template<typename SystemType>
        void updateSystem(EntityManager& entity_manager, double dt);

    private:

        System *systems_[SystemTypes::getTypesCount()];
        internal::UpdateFuncs updateFuncs_;
        internal::SystemManagerHelper helper_;
    };
}

#include "SystemManager.inl"
#endif //SYSTEMMANAGER_H
