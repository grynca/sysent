#include "Entity.h"
#include "EntityManager.h"
#include "System.h"

namespace grynca {

    template <typename ComponentDataType>
    inline ComponentDataType* Entity::getData()const {
        u32 comp_pos = getTypeInfo().getComponentPos<ComponentDataType>();
        u8* comp_data = mgr_->getEntitiesPool(index_.getEntityTypeId()).get(index_.getInnerIndex(), comp_pos);
        return (ComponentDataType*)(comp_data);
    }

    template <typename EntityAccessor>
    inline EntityAccessor Entity::get() {
        EntityAccessor ea;
        ea.init_(*this);
        ea.construct();
        return ea;
    }

    template <typename EntityAccessor, typename ... Args>
    inline EntityAccessor Entity::getAndInit(Args&&... args) {
        EntityAccessor ea(*this);
        ea.init(std::forward<Args>(args)...);
        return ea;
    };

    inline const EntityTypeInfo& Entity::getTypeInfo()const {
        return mgr_->getEntityTypeInfo(index_.getEntityTypeId());
    }

    inline void Entity::kill() {
        mgr_->to_remove_.push_back(*this);
    }

    inline const FlagsMaskLong& Entity::getFlags() {
        return getBase_().flags_;
    }

    inline void Entity::setFlag(u32 flag_id, void* data) {
        CBase& cb = getBase_();
        FlagsMaskLong set_bits = mgr_->tracked_flag_bits_[flag_id] & (cb.flags_ ^ mgr_->tracked_flag_bits_[flag_id]);

        cb.flags_ |= mgr_->tracked_flag_bits_[flag_id];

        EntityFlagCtx efctx(*this, flag_id, data);

        LOOP_SET_BITS(set_bits, it) {
            SystemBase* sys = mgr_->flag_bit_to_system_[it.getPos()];
            // TODO: tenhle if by mozna nemusel byt nutnej, kdybych si getoval nejakou masku zainteresovanych systemu rovnou z kompozice
            if (sys->careAboutEntity(*this)) {
                sys->flag_recieve_func_(efctx);
            }
        }
    }

    inline void Entity::setFlag(u32 flag_id, SystemPos from, void* data) {
        CBase& cb = getBase_();
        FlagsMaskLong set_bits = mgr_->tracked_flag_bits_[flag_id] & (cb.flags_ ^ mgr_->tracked_flag_bits_[flag_id]);
        cb.flags_ |= mgr_->tracked_flag_bits_[flag_id];

        EntityFlagCtx efctx(*this, flag_id, data);

        LOOP_SET_BITS(set_bits, it) {
            SystemBase* sys = mgr_->flag_bit_to_system_[it.getPos()];
            if (sys->getSystemPos().pipeline_id != from.pipeline_id || sys->getSystemPos().system_id <= from.system_id)
                continue;
            if (sys->careAboutEntity(*this)) {
                sys->flag_recieve_func_(efctx);
            }
        }
    }

    inline void Entity::clearFlag(u32 flag_id) {
        // clear for all systems observing this flag
        getBase_().flags_ &= ~mgr_->tracked_flag_bits_[flag_id];
    }

    inline bool Entity::getFlag(u32 flag_id) {
        CBase& cb = getBase_();
        return (cb.flags_ & mgr_->tracked_flag_bits_[flag_id]).any();
    }

    inline bool Entity::getFlag(SystemBase* system, u32 flag_id) {
        CBase& cb = getBase_();
        return cb.flags_[system->getFlagPosition_(flag_id)];
    }

    inline void Entity::clearTrackedFlagsForSystem(SystemBase* system) {
        CBase& cb = getBase_();
        cb.flags_ &= ~(system->flag_positions_mask_);
    }

    inline const RolesMask& Entity::getRoles()const {
        return mgr_->roles_compositions_.getComposition(getBase_().roles_composition_id).getMask();
    }

    inline void Entity::addRole(u32 role_id) {
        RolesMask rm = getRoles();
        ASSERT_M( !rm[role_id], "Role already set.");
        rm |= (1<<role_id);
        getBase_().roles_composition_id = mgr_->roles_compositions_.getOrCreateId(rm, mgr_->pipelines_);
        mgr_->afterEntityRoleAdded_(*this, role_id);
    }

    inline void Entity::removeRole(u32 role_id) {
        RolesMask rm = getRoles();
        ASSERT( !rm[role_id] );
        mgr_->beforeEntityRoleRemoved_(*this, role_id);
        rm &= ~(1<<role_id);
        getBase_().roles_composition_id = mgr_->roles_compositions_.getOrCreateId(rm, mgr_->pipelines_);
    }

    template <typename EventType, typename ... ConstrArgs>
    inline void Entity::emitEvent(ConstrArgs&&... args)const {
        EventType ev(std::forward<ConstrArgs>(args)...);
        ev.e_ = *this;
        mgr_->roles_compositions_.getComposition(getBase_().roles_composition_id).emitEvent(ev);
    }

    inline bool Entity::isValid()const {
        return index_ != EntityIndex::Invalid();
    }

    template <typename FuncType>
    inline void Entity::callOnEntity(const FuncType& f) {
        f(*this);
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
    inline constexpr RolesMask Entity::getStaticComponentRoles() {
        // static
        RolesMask roles;
        ComponentTypes::template callOnTypes<internal::GetTypesRoles>(roles);
        return roles;
    }

    template <typename ... CDataTypes>
    inline EntityCachedComps<CDataTypes...>::EntityCachedComps() {
        memset(comp_bufs_, 0, sizeof(comp_bufs_));
    }

    template <typename ... CDataTypes>
    void EntityCachedComps<CDataTypes...>::cacheAll(EntityManager& emgr, u16 entity_type_id) {
        emgr.getComponentsBufs<ComponentDataTypes>(entity_type_id, comp_bufs_);
    }

    template <typename ... CDataTypes>
    template <typename CompsTypesPack>
    void EntityCachedComps<CDataTypes...>::cache(EntityManager& emgr, u16 entity_type_id) {
        emgr.getComponentsBufs<CompsTypesPack>(entity_type_id, comp_bufs_);
    }

    template <typename ... CDataTypes>
    template <typename CDataType>
    inline CDataType* EntityCachedComps<CDataTypes...>::getData(EntityIndex eid) {
        u32 pos = u32(ComponentDataTypes::template pos<CDataType>());
        ASSERT_M(pos != InvalidId(), "Comp. data not contained in accessor.");
        return (CDataType*)comp_bufs_[pos]->accItem(eid.getEntityIndex());
    }

    template <typename ... CDataTypes>
    template <typename CDataType>
    inline const CDataType* EntityCachedComps<CDataTypes...>::getData(EntityIndex eid)const {
        u32 pos = u32(ComponentDataTypes::template pos<CDataType>());
        ASSERT_M(pos != InvalidId(), "Comp. data not contained in accessor.");
        return (CDataType*)comp_bufs_[pos]->accItem(eid.getEntityIndex());
    }

    template <typename ... CDataTypes>
    inline Entity& EntityAccessor<CDataTypes...>::accEntity() {
        ASSERT_M(me_.isValid(),
                "Entity is not valid, arent you accessing it in constructor ?");
        return me_;
    }

    template <typename ... CDataTypes>
    inline constexpr RolesMask EntityAccessor<CDataTypes...>::getStaticComponentRoles() {
        //static
        return Entity::getStaticComponentRoles<ComponentDataTypes>();
    }

    template <typename ... CDataTypes>
    inline const Entity& EntityAccessor<CDataTypes...>::getEntity()const {
        ASSERT_M(me_.isValid(),
                 "Entity is not valid, arent you accessing it in constructor ?");
        return me_;
    }

    template <typename ... CDataTypes>
    inline EntityIndex EntityAccessor<CDataTypes...>::getEntityIndex()const {
        return me_.getIndex();
    }

    template <typename ... CDataTypes>
    template <typename CDataType>
    inline CDataType* EntityAccessor<CDataTypes...>::getData() {
        return cached_comps_.template getData<CDataType>(getEntityIndex());
    }

    template <typename ... CDataTypes>
    template <typename CDataType>
    inline const CDataType* EntityAccessor<CDataTypes...>::getData()const {
        return cached_comps_.template getData<CDataType>(getEntityIndex());
    }

    template <typename ... CDataTypes>
    template <typename EntAcc>
    inline EntAcc EntityAccessor<CDataTypes...>::get() {
        // TODO: try to use already cached comps
        return me_.get<EntAcc>();
    }

    template <typename ... CDataTypes>
    template <typename EntAcc, typename ... Args>
    inline EntAcc EntityAccessor<CDataTypes...>::getAndInit(Args&&... args) {
        return me_.getAndInit<EntAcc>(std::forward<Args>(args)...);
    };

    template <typename ... CDataTypes>
    inline bool EntityAccessor<CDataTypes...>::isValid()const {
        return me_.isValid();
    }

    template <typename ... CDataTypes>
    inline void EntityAccessor<CDataTypes...>::init_(const Entity& e) {
        me_ = e;
        cached_comps_.cacheAll(e.getManager(), e.getIndex().getEntityTypeId());
    }

    template <typename ... CDataTypes>
    template <typename FuncType>
    inline void EntityAccessor<CDataTypes...>::callOnEntity(const FuncType& f) {
        f(getEntity());
    }
}