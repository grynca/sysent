#include "SystemManager.h"
#include "EntityManager.h"

namespace grynca {

    inline SystemManager::SystemManager()
        : helper_(systems_)
    {
    }


    inline System* SystemManager::getSystem(uint32_t system_id) {
        return systems_[system_id];
    }

    template <typename SystemType>
    inline SystemType& SystemManager::getSystem() {
        uint32_t system_id = SystemTypes::pos<SystemType>();
        System* s =getSystem(system_id);
        assert(s);
        return *(SystemType*)s;
    }

    inline void SystemManager::updateSystem(uint32_t system_id, EntityManager& entity_manager, float dt) {
        System* s = systems_[system_id];
        s->preUpdate();
        RolesMask needed_roles = s->getNeededRoles();
        for (uint32_t i=0; i<entity_manager.getItemsCount(); ++i) {
            Entity& entity = entity_manager.getItemAtPos(i);
            if ( (needed_roles&entity.getRoles()) == needed_roles ) {
                s->update(entity, dt);
            }
        }
        s->postUpdate();
    }

    template <typename SystemType>
    inline void SystemManager::updateSystem(EntityManager& entity_manager, float dt) {
        updateSystem(SystemTypes::pos<SystemType>(), entity_manager, dt);
    }
}
