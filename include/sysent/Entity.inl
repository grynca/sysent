#include "Entity.h"
#include "EntityManager.h"
#include "SystemBase.h"

namespace grynca {

    template <typename ComponentType>
    inline ComponentType& Entity::getComponent() {
        uint32_t offset = getTypeInfo().getComponentOffset<ComponentType>();
        assert(offset != uint32_t(-1));
        return *(ComponentType*)(comps_data_+offset);
    }

    template <typename ComponentType>
    inline const ComponentType& Entity::getComponent()const {
        uint32_t offset = getTypeInfo().getComponentOffset<ComponentType>();
        assert(offset != uint32_t(-1));
        return *(ComponentType*)(comps_data_+offset);
    }

    inline const EntityTypeInfo& Entity::getTypeInfo()const {
        return mgr_->getEntityTypeInfo(index_.getEntityTypeId());
    }

    inline void Entity::updateDataPointer() {
        comps_data_ = mgr_->getEntity(index_).comps_data_;
    }

    inline void Entity::kill() {
        mgr_->removeEntityFromSystems_(*this);
    }

    inline const RolesMask& Entity::getRoles() {
        return getBase_().roles_;
    }

    inline void Entity::setRoles(const RolesMask& roles) {
        mgr_->beforeEntityRolesChanged_(*this, roles);
        getBase_().roles_ = roles;
    }

    inline bool Entity::hasRoles(const RolesMask& roles) {
        return (getRoles()&roles) == roles;
    }

    inline void Entity::addRoles(const RolesMask& roles) {
        mgr_->beforeEntityRolesChanged_(*this, roles);
        getBase_().roles_ |= roles;
    }

    inline const FlagsMaskLong& Entity::getFlagsMask() {
        return getBase_().flags_;
    }

    inline void Entity::setFlag(uint8_t flag_id) {
        getBase_().flags_ |= mgr_->flag_bits_[flag_id];
    }

    inline void Entity::clearFlag(uint8_t flag_id) {
        getBase_().flags_ &= ~mgr_->flag_bits_[flag_id];
    }

    inline bool Entity::getFlag(SystemBase* system, uint8_t flag_id) {
        return getBase_().flags_[system->getFlagPosition_(flag_id)];
    }

    inline uint8_t* Entity::getData() {
        return comps_data_;
    }

    inline const uint8_t* Entity::getData()const {
        return comps_data_;
    }

    inline void Entity::clearTrackedFlagsForSystem_(SystemBase* system) {
        getBase_().flags_ &= ~(system->flag_positions_mask_);
    }

    inline CBase& Entity::getBase_() {
        return *(CBase*)comps_data_;
    }

    template <typename ComponentTypes>
    inline RolesMask Entity::getComponentsRoles_() {
    // static
        RolesMask roles;
        ComponentTypes::template callOnTypes<InitialRolesGetter_>(roles);
        return roles;
    }
}