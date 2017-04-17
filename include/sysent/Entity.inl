#include "Entity.h"
#include "EntityManager.h"
#include "SystemAll.h"

namespace grynca {

    template <typename ... CDataTypes>
    inline Entity& EntityAccessor<CDataTypes...>::getEntity() {
        return *me_;
    }

    template <typename ... CDataTypes>
    inline const Entity& EntityAccessor<CDataTypes...>::getEntity()const {
        return *me_;
    }

    template <typename ... CDataTypes>
    template <typename CDataType>
    inline CDataType& EntityAccessor<CDataTypes...>::getData() {
        return *(CDataType*)data_[ComponentDataTypes::template pos<CDataType>()];
    }

    template <typename ... CDataTypes>
    template <typename CDataType>
    inline const CDataType& EntityAccessor<CDataTypes...>::getData()const {
        return *(CDataType*)data_[ComponentDataTypes::template pos<CDataType>()];
    }

    template <typename ... CDataTypes>
    inline void EntityAccessor<CDataTypes...>::init_(Entity& me) {
        me_=&me;
        ComponentDataTypes::template callOnTypes<GetDataPtrs>(me, data_);
    }

    template <typename ... CDataTypes>
    template <typename TP, typename T>
    inline void EntityAccessor<CDataTypes...>::GetDataPtrs::f(Entity& e, void** data) {
        // static
        data[TP::template pos<T>()] = &e.getData<T>();
    }

    template <typename ComponentDataType>
    inline ComponentDataType& Entity::getData()const {
        u32 comp_pos = getTypeInfo().getComponentPos<ComponentDataType>();
        u8* comp_data = mgr_->getEntitiesPool(index_.getEntityTypeId()).get(index_.getInnerIndex(), comp_pos);
        return *(ComponentDataType*)(comp_data);
    }

    template <typename ComponentType>
    inline ComponentType Entity::get() {
        ComponentType comp;
        comp.init_(*this);
        return comp;
    }

    inline const EntityTypeInfo& Entity::getTypeInfo()const {
        return mgr_->getEntityTypeInfo(index_.getEntityTypeId());
    }

    inline void Entity::kill() {
        mgr_->to_remove_.push_back(*this);
    }

    inline const FlagsMaskLong& Entity::getFlagsMask() {
        return getBase_().flags_;
    }

    inline void Entity::setFlag(u32 flag_id) {
        CBaseData& cb = getBase_();
        FlagsMaskLong set_bits = mgr_->tracked_flag_bits_[flag_id] & (cb.flags_ ^ mgr_->tracked_flag_bits_[flag_id]);
        cb.flags_ |= mgr_->tracked_flag_bits_[flag_id];

        LOOP_SET_BITS(set_bits, it) {
            SystemBase* sys = mgr_->flag_bit_to_system_[it.getPos()];
            sys->flag_recieve_func_(*this, flag_id);
        }
    }

    inline void Entity::setFlag(u32 flag_id, SystemPos from) {
        CBaseData& cb = getBase_();
        FlagsMaskLong set_bits = mgr_->tracked_flag_bits_[flag_id] & (cb.flags_ ^ mgr_->tracked_flag_bits_[flag_id]);
        cb.flags_ |= mgr_->tracked_flag_bits_[flag_id];

        LOOP_SET_BITS(set_bits, it) {
            SystemBase* sys = mgr_->flag_bit_to_system_[it.getPos()];
            if (sys->getSystemPos().pipeline_id != from.pipeline_id || sys->getSystemPos().system_id <= from.system_id)
                continue;

            sys->flag_recieve_func_(*this, flag_id);
        }
    }

    inline void Entity::clearFlag(u32 flag_id) {
        // clear for all systems observing this flag
        getBase_().flags_ &= ~mgr_->tracked_flag_bits_[flag_id];
    }

    inline bool Entity::getFlag(u32 flag_id) {
        CBaseData& cb = getBase_();
        return (cb.flags_ & mgr_->tracked_flag_bits_[flag_id]).any();
    }

    inline bool Entity::getFlag(SystemBase* system, u32 flag_id) {
        return getBase_().flags_[system->getFlagPosition_(flag_id)];
    }

    inline const RolesMask& Entity::getRoles()const {
        return mgr_->roles_compositions_.getComposition(getBase_().roles_composition_id).getMask();
    }

    inline void Entity::addRole(u32 role_id) {
        RolesMask rm = getRoles();
        ASSERT( !rm[role_id] );
        rm |= (1<<role_id);
        getBase_().roles_composition_id = mgr_->roles_compositions_.getId(rm, mgr_->pipelines_);
        mgr_->afterEntityRoleAdded_(*this, role_id);
    }

    inline void Entity::removeRole(u32 role_id) {
        RolesMask rm = getRoles();
        ASSERT( !rm[role_id] );
        mgr_->beforeEntityRoleRemoved_(*this, role_id);
        rm &= ~(1<<role_id);
        getBase_().roles_composition_id = mgr_->roles_compositions_.getId(rm, mgr_->pipelines_);
    }

    template <typename EventType, typename ... ConstrArgs>
    inline void Entity::emitEvent(ConstrArgs&&... args)const {
        EventType ev(std::forward<ConstrArgs>(args)...);
        ev.e_ = *this;
        mgr_->roles_compositions_.getComposition(getBase_().roles_composition_id).emitEvent(ev);
    }

    inline CBaseData& Entity::getBase_() {
        u8* comp_data = mgr_->getEntitiesPool(index_.getEntityTypeId()).get(index_.getInnerIndex(), 0);
        return *(CBaseData*)comp_data;
    }

    inline const CBaseData& Entity::getBase_()const {
        u8* comp_data = mgr_->getEntitiesPool(index_.getEntityTypeId()).get(index_.getInnerIndex(), 0);
        return *(CBaseData*)comp_data;
    }

    inline void Entity::clearTrackedFlagsForSystem_(SystemBase* system) {
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