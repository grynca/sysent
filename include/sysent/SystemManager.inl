#include "SystemManager.h"
#include "EntityManager.h"

namespace grynca {

    template <typename EntityTypes, typename SystemTypes>
    inline SystemManager<EntityTypes, SystemTypes>::SystemManager(EntityManager<EntityTypes>& entity_manager)
        : entity_manager_(&entity_manager)
    {
    }

    template <typename EntityTypes, typename SystemTypes>
    template <typename ... InitArgs>
    void SystemManager<EntityTypes, SystemTypes>::init(InitArgs&&... args) {
        helper_.init(std::forward<InitArgs>(args)...);
    }

    template <typename EntityTypes, typename SystemTypes>
    inline void* SystemManager<EntityTypes, SystemTypes>::getSystem(uint32_t system_id) {
        return helper_.systems_.get(system_id);
    }

    template <typename EntityTypes, typename SystemTypes>
    template <typename SystemType>
    inline SystemType& SystemManager<EntityTypes, SystemTypes>::getSystem() {
        uint32_t system_id = SystemTypes::template pos<SystemType>();
        void* s =getSystem(system_id);
        assert(s);
        return *(SystemType*)s;
    }

    template <typename EntityTypes, typename SystemTypes>
    void SystemManager<EntityTypes, SystemTypes>::update(float dt) {

        // remove dying entities
        for (uint32_t i=0; i<entity_manager_->getItemsCount(); ++i) {
            Entity<EntityTypes>& entity = entity_manager_->getItemAtPos(i);
            if (entity.template getBase<EntityBase>().isDying()) {
                entity_manager_->removeItem(entity.getId());
                --i;
            }
        }

        for (uint32_t i=0; i<helper_.systems_.getSize(); ++i) {
            updateSystem_(i, dt);
        }
    }

    template <typename EntityTypes, typename SystemTypes>
    inline void SystemManager<EntityTypes, SystemTypes>::updateSystem_(uint32_t system_id, float dt) {
        void* s = helper_.systems_.get(system_id);
        helper_.funcs_[system_id].pre_update(s);
        RolesMask needed_roles = helper_.funcs_[system_id].get_mask(s);
        for (uint32_t i=0; i<entity_manager_->getItemsCount(); ++i) {
            Entity<EntityTypes>& entity = entity_manager_->getItemAtPos(i);
            const RolesMask& ent_roles = entity.template getBase<EntityBase>().getRoles();
            if ( (needed_roles&ent_roles) == needed_roles ) {
                helper_.funcs_[system_id].ent_update(s, entity, dt);
            }
        }
        helper_.funcs_[system_id].post_update(s);
    }
}
