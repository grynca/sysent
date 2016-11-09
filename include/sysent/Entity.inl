#include "Entity.h"
#include "EntityManager.h"
#include "System.h"

namespace grynca {

    template <typename ComponentType>
    inline ComponentType& Entity::getComponent() {
        u32 comp_pos = getTypeInfo().getComponentPos<ComponentType>();
        u8* comp_data = mgr_->getEntitiesPool(index_.getEntityTypeId()).get(index_.getInnerIndex(), comp_pos);
        return *(ComponentType*)(comp_data);
    }

    template <typename ComponentType>
    inline const ComponentType& Entity::getComponent()const {
        u32 comp_pos = getTypeInfo().getComponentPos<ComponentType>();
        u8* comp_data = mgr_->getEntitiesPool(index_.getEntityTypeId()).get(index_.getInnerIndex(), comp_pos);
        return *(ComponentType*)(comp_data);
    }

    inline const EntityTypeInfo& Entity::getTypeInfo()const {
        return mgr_->getEntityTypeInfo(index_.getEntityTypeId());
    }

    inline void Entity::kill() {
        mgr_->beforeEntityKilled_(*this);
    }

    inline void Entity::create() {
        mgr_->afterEntityCreated_(*this);
    }

    inline RolesMask& Entity::accRoles() {
        return getBase_().roles_;
    }

    inline const RolesMask& Entity::getRoles() {
        return getBase_().roles_;
    }

    inline void Entity::addRole(u32 role_id) {
        mgr_->beforeEntityRoleAdded_(*this, role_id);
        getBase_().roles_ |= 1<<role_id;
    }

    inline void Entity::removeRole(u32 role_id) {
        mgr_->beforeEntityRoleRemoved_(*this, role_id);
        getBase_().roles_ &= ~(1<<role_id);
    }

    inline const FlagsMask& Entity::getFlags()const {
        return getBase_().flags_;
    }

    inline void Entity::setFlag(u32 flag_id) {
        getBase_().next_flags_ |= 1<<flag_id;
    }

    inline void Entity::setFlags(const FlagsMask& fm) {
        getBase_().next_flags_ |= fm;
    }

    inline FlagsMask& Entity::accFlags() {
        return getBase_().flags_;
    }

    inline const FlagsMask& Entity::getNextFlags()const {
        return getBase_().next_flags_;
    }

    inline FlagsMask& Entity::accNextFlags() {
        return getBase_().next_flags_;
    }

    inline CBase& Entity::getBase_() {
        u8* comp_data = mgr_->getEntitiesPool(index_.getEntityTypeId()).get(index_.getInnerIndex(), 0);
        return *(CBase*)comp_data;
    }

    inline const CBase& Entity::getBase_()const {
        u8* comp_data = mgr_->getEntitiesPool(index_.getEntityTypeId()).get(index_.getInnerIndex(), 0);
        return *(CBase*)comp_data;
    }

    template <typename ComponentTypes>
    inline RolesMask Entity::getInitialComponentsRoles_() {
    // static
        RolesMask roles;
        ComponentTypes::template callOnTypes<InitialRolesGetter_>(roles);
        return roles;
    }
}