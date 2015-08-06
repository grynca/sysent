#include "SystemManager.h"
#include "EntityManager.h"

namespace grynca {

    inline SystemManager::SystemManager()
        : helper_(systems_, updateFuncs_)
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

    inline void SystemManager::updateSystem(uint32_t system_id, EntityManager& entity_manager, double dt) {
        RolesMask needed_roles = systems_[system_id]->getNeededRoles();
        for (uint32_t i=0; i<entity_manager.getItemsCount(); ++i) {
            Entity& entity = entity_manager.getItemAtPos(i);
            if ( (needed_roles&entity.getRoles()) == needed_roles ) {
                updateFuncs_.funcs[system_id][entity.getCurrentType()](systems_[system_id], entity, dt);
            }
        }
    }

    template <typename SystemType>
    inline void SystemManager::updateSystem(EntityManager& entity_manager, double dt) {
        updateSystem(SystemTypes::pos<SystemType>(), entity_manager, dt);
    }

    inline void SystemManager::updateAllSystems(EntityManager& entity_manager, double dt) {
        for (uint32_t i=0; i<SystemTypes::getTypesCount(); ++i)
            updateSystem(i, entity_manager, dt);
    }
}
