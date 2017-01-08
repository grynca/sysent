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

    template <typename ComponentType>
    inline typename ComponentType::Setter Entity::getComponentSetter() {
        return getComponent<ComponentType>().getSetter(*this);
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

    inline const RolesMask& Entity::getRoles()const {
        return mgr_->role_masks_.getMask(getBase_().roles_mask_id_);
    }

    inline void Entity::addRole(u32 role_id) {
        RolesMask rm = getRoles();
        ASSERT( !rm[role_id] );
        rm |= (1<<role_id);
        getBase_().roles_mask_id_ = mgr_->role_masks_.getId(rm, mgr_->pipelines_);
        mgr_->afterEntityRoleAdded_(*this, role_id);
    }

    inline void Entity::removeRole(u32 role_id) {
        RolesMask rm = getRoles();
        ASSERT( !rm[role_id] );
        mgr_->beforeEntityRoleRemoved_(*this, role_id);
        rm &= ~(1<<role_id);
        getBase_().roles_mask_id_ = mgr_->role_masks_.getId(rm, mgr_->pipelines_);
    }

    inline const FlagsMaskLong& Entity::getFlagsMask() {
        return getBase_().flags_;
    }

    inline void Entity::setFlag(u32 flag_id) {
        CBase& cb = getBase_();
        FlagsMaskLong prev_flags = cb.flags_;
        cb.flags_ |= mgr_->tracked_flag_bits_[flag_id];

        EntityManager::RoleMasks::RolesMaskInfo& rmi = mgr_->role_masks_.getInfo(cb.roles_mask_id_);
        for (u32 i=0; i<rmi.needs_flag_[flag_id].size(); ++i) {
            FlaggedSystem* sf = rmi.needs_flag_[flag_id][i];

            bool already_added = (prev_flags&sf->getNeededFlagsMask()).any();
            if (!already_added) {
                sf->addFlaggedEntity_(*this);
            }
        }
    }

    inline void Entity::setFlag(u32 flag_id, u32 from_system_id) {
        CBase& cb = getBase_();
        FlagsMaskLong prev_flags = cb.flags_;
        cb.flags_ |= mgr_->tracked_flag_bits_[flag_id];

        EntityManager::RoleMasks::RolesMaskInfo& rmi = mgr_->role_masks_.getInfo(cb.roles_mask_id_);
        for (u32 i=0; i<rmi.needs_flag_[flag_id].size(); ++i) {
            FlaggedSystem* sf = rmi.needs_flag_[flag_id][i];
            if (sf->getSystemId() <= from_system_id)
                continue;

            bool already_added = (prev_flags&sf->getNeededFlagsMask()).any();
            if (!already_added) {
                sf->addFlaggedEntity_(*this);
            }
        }
    }

    inline void Entity::clearFlag(u32 flag_id) {
        getBase_().flags_ &= ~mgr_->tracked_flag_bits_[flag_id];
        // TODO: remove from flagged systems ?
    }

    inline bool Entity::getFlag(u32 flag_id) {
        CBase& cb = getBase_();
        return (cb.flags_ & mgr_->tracked_flag_bits_[flag_id]).any();
    }

    inline bool Entity::getFlag(System* system, u32 flag_id) {
        return getBase_().flags_[system->getFlagPosition_(flag_id)];
    }

    inline CBase& Entity::getBase_() {
        u8* comp_data = mgr_->getEntitiesPool(index_.getEntityTypeId()).get(index_.getInnerIndex(), 0);
        return *(CBase*)comp_data;
    }

    inline const CBase& Entity::getBase_()const {
        u8* comp_data = mgr_->getEntitiesPool(index_.getEntityTypeId()).get(index_.getInnerIndex(), 0);
        return *(CBase*)comp_data;
    }

    inline void Entity::clearTrackedFlagsForSystem_(System* system) {
        getBase_().flags_ &= ~(system->flag_positions_mask_);
    }

    template <typename ComponentTypes>
    inline RolesMask Entity::getInitialComponentsRoles_() {
    // static
        RolesMask roles;
        ComponentTypes::template callOnTypes<InitialRolesGetter_>(roles);
        return roles;
    }
}