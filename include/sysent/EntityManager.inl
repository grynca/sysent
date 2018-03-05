#include "EntityManager.h"
#include "Entity.h"
#include "System.h"
#include "types/Type.h"

namespace grynca {

    inline EntityManager::~EntityManager() {
        destroy();
    }

    inline EntityManager::EntityManager()
     : entities_cnt_(0), entity_types_cnt_(0), flags_count_(0)
    {
        for (u32 i=0; i<SYSENT_PIPELINES_CNT; ++i) {
            PROFILE_ID_INIT(pipelines_[i].upd_prof_, "Pipeline " + ssu::toStringA(i));
        }
        memset(flag_bit_to_system_, 0, FlagsMaskLong::size()*sizeof(SystemBase*));
    }

    template <typename EntityTypes>
    inline void EntityManager::addEntityTypes(u32 initial_reserve) {
        EntityTypes::template callOnTypes<EntityTypesInitializer_>(*this, initial_reserve);
    }

    inline Entity EntityManager::newEntity(u16 entity_type_id) {
        EntityTypeCtx& etctx = entity_types_[entity_type_id];
        EntityIndex id;
        id.accInnerIndex() = etctx.pool.addAndConstruct();
        id.setEntityTypeId(entity_type_id);

        Entity new_ent;
        new_ent.index_ = id;
        new_ent.mgr_ = this;
        new_ent.getBase_().roles_composition_id = etctx.roles_composition_id;

        to_create_.push_back(new_ent);
        return new_ent;
    }

    inline Entity EntityManager::getEntity(EntityIndex id)const {
        ASSERT(id.isValid());
        Entity ent;
        ent.mgr_ = const_cast<EntityManager*>(this);
        ent.index_ = id;
        return ent;
    }

    inline bool EntityManager::tryGetEntity(EntityIndex id, Entity& e_out)const {
        if (id.getEntityTypeId() >= entity_types_cnt_)
            return false;

        const EntityTypeCtx& etctx = entity_types_[id.getEntityTypeId()];

        if (!etctx.pool.isValidIndex(id.accInnerIndex()))
            return false;

        e_out.mgr_ = const_cast<EntityManager*>(this);
        e_out.index_ = id;
        return true;
    }

    template <typename LoopFunc>
    inline void EntityManager::loopEntities(u16 entities_type_id, const LoopFunc& lf) {
        Entity e;
        e.mgr_ = this;
        e.index_.setEntityTypeId(entities_type_id);

        EntitiesPool& pool = entity_types_[entities_type_id].pool;
        for (u32 pos=0; pos<pool.getSize(); ++pos) {
            if (!pool.isFree(pos)) {
                pool.getIndexForPos2(pos, e.index_.accInnerIndex());
                lf(e);
            }
        }
    }

    template <typename EntityAcc>
    inline EntityAcc EntityManager::newEntity(u16 entity_type_id) {
        Entity e = newEntity(entity_type_id);
        return e.get<EntityAcc>();
    }

    template <typename EntityAcc>
    inline EntityAcc EntityManager::getEntity(EntityIndex id)const {
        Entity e = getEntity(id);
        return e.get<EntityAcc>();
    }

    template <typename EntityAcc>
    inline bool EntityManager::tryGetEntity(EntityIndex id, EntityAcc& eac_out)const {
        if (id.getEntityTypeId() >= entity_types_cnt_)
            return false;

        const EntityTypeCtx& etctx = entity_types_[id.getEntityTypeId()];

        if (!etctx.pool.isValidIndex(id.accInnerIndex()))
            return false;

        Entity e;
        e.mgr_ = const_cast<EntityManager*>(this);
        e.index_ = id;
        eac_out = e.get<EntityAcc>();
        return true;
    }

    inline u32 EntityManager::getEntitiesCount()const {
        return entities_cnt_;
    }

    inline EntityTypeInfo& EntityManager::getEntityTypeInfo(u16 entity_type_id) {
        return entity_types_[entity_type_id].info;
    }

    inline u16 EntityManager::getEntityTypesCount()const {
        return entity_types_cnt_;
    }

    inline EntitiesPool& EntityManager::getEntitiesPool(u16 entity_type_id) {
        return entity_types_[entity_type_id].pool;
    }

    template <typename SystemType>
    inline SystemType& EntityManager::addSystem(u32 pipeline_id) {
        ASSERT(pipeline_id < SYSENT_PIPELINES_CNT);
        ASSERT_M(!getSystemByType<SystemType>(pipeline_id), "System already contained in this pipeline");
        ASSERT(pipelines_[pipeline_id].systems.size() < SYSENT_MAX_SYSTEMS_PER_PIPELINE);

        SystemType* system = new SystemType();
        SystemBase* sb = (SystemBase*)system;
        u32 system_id = u32(pipelines_[pipeline_id].systems.size());
        pipelines_[pipeline_id].systems.push_back(sb);

        u32 int_sys_type_id = Type<SystemType, EntityManager>::getInternalTypeId();
        if (int_sys_type_id >= pipelines_[pipeline_id].systems_by_type.size()) {
            pipelines_[pipeline_id].systems_by_type.resize(int_sys_type_id+1, NULL);
        }
        pipelines_[pipeline_id].systems_by_type[int_sys_type_id] = sb;

        sb->init_(*this, entity_types_cnt_, pipeline_id, system_id);

        for (u32 i=0; i<roles_compositions_.getInfosCount(); ++i) {
            roles_compositions_.accComposition(i).addForSystem(sb);
        }

        LOOP_SET_BITS(sb->getNeededRoles(), it) {
            systems_for_role_[pipeline_id][it.getPos()].set(system_id);
        }
        return *system;
    }

    template <typename SystemType>
    SystemType* EntityManager::getSystemByType(u32 pipeline_id) {
        ASSERT(pipeline_id < SYSENT_PIPELINES_CNT);
        u32 int_sys_type_id = Type<SystemType, EntityManager>::getInternalTypeId();
        fast_vector<SystemBase*>& sbt = pipelines_[pipeline_id].systems_by_type;
        if (int_sys_type_id < sbt.size()) {
            return (SystemType*)sbt[int_sys_type_id];
        }
        return NULL;
    }

    inline SystemBase* EntityManager::getSystem(SystemPos system_pos) {
        ASSERT(system_pos.pipeline_id < SYSENT_PIPELINES_CNT);
        return pipelines_[system_pos.pipeline_id].systems[system_pos.system_id];
    }

    inline u32 EntityManager::getSystemsPipelineSize(u32 pipeline_id) {
        ASSERT(pipeline_id < SYSENT_PIPELINES_CNT);
        return u32(pipelines_[pipeline_id].systems.size());
    }

    inline void EntityManager::updateSystemsPipeline(u32 pipeline_id, f32 dt) {
        ASSERT(pipeline_id < SYSENT_PIPELINES_CNT);
        PROFILE_SAMPLE(pipelines_[pipeline_id].upd_prof_);

        for (u32 i=0; i<pipelines_[pipeline_id].systems.size(); ++i) {
            SystemBase* sb = pipelines_[pipeline_id].systems[i];
            if (sb->isEnabled()) {
                // before each system loop check if there are some ents to create/destroy
                if (!to_create_.empty()) {
                    for (u32 j=0; j<to_create_.size(); ++j) {
                        Entity e = to_create_[j];       // copy because array can change
                        afterEntityCreated_(e);
                        ++entities_cnt_;
                    }
                    to_create_.clear();
                }
                if (!to_remove_.empty()) {
                    for (u32 j=0; j<to_remove_.size(); ++j) {
                        Entity e = to_remove_[j];       // copy because array can change
                        beforeEntityKilled_(e);
                        --entities_cnt_;
                    }
                    to_remove_.clear();
                }
                sb->update_(dt);
            }
        }
    }

    inline std::string EntityManager::getTypesDebugString()const {
        std::ostringstream ss;
        ss << "Component types:" << std::endl;
        ss << InternalTypes<EntityTypeInfo>::getDebugString(" ");

        ss << "Entity types:" << std::endl;
        for (u32 i=0; i<entity_types_cnt_; ++i) {
            const EntityTypeInfo& eti = entity_types_[i].info;
            ss << (" " +ssu::toStringA(i) + ": " + eti.getTypeInfo().getTypename().c_str()) << std::endl
               << "  roles:" << eti.getInitialComponentRoles().to_string()
               << ", size: " << eti.getComponentsSize()
               << ", components: ";
            fast_vector<u32> cc = eti.getContainedComponents();
            for (u32 j=0; j<cc.size(); ++j) {
                if (j != 0)
                    ss << ", ";
                ss << ssu::toStringA(cc[j]);
            }
            ss << std::endl;
        }
        return ss.str();
    }

    inline ObjFunc<void(Entity& ent)>& EntityManager::accBeforeEntityKilled() {
        return before_entity_killed_;
    }

    inline void EntityManager::destroy() {
        // call entities' before-destroy-funcs
        Entity e;
        e.mgr_ = this;
        for (u32 et_id=0; et_id<entity_types_cnt_; ++et_id) {
            EntitiesPool& pool = entity_types_[et_id].pool;
            e.accIndex().setEntityTypeId(u16(et_id));
            for (u32 pos=0; pos<pool.getSize(); ++pos) {
                if (!pool.isFree(pos)) {
                    pool.getIndexForPos2(pos, e.accIndex().accInnerIndex());
                    before_entity_killed_(e);
                }
            }
            // clear entity comps
            pool.clear();
        }
        // destroy systems
        for (u32 i=0; i<SYSENT_PIPELINES_CNT; ++i) {
            SystemsPipeline& sp = pipelines_[i];
            for (u32 j = 0; j < sp.systems.size(); ++j) {
                delete sp.systems[j];
            }
            sp.systems.clear();
        }
    }

    template <typename ComponentTypes>
    inline void EntityManager::getComponentsBufs(u16 entity_type_id, ChunkedBuffer** comp_bufs) {
        ComponentTypes::template callOnTypes<GetCompBufs_>(*this, entity_type_id, comp_bufs);
    }

    template <typename EntityTypes, typename T>
    inline void EntityManager::EntityTypesInitializer_::f(EntityManager& mgr, u32 initial_reserve) {
        //static
        ASSERT(mgr.entity_types_cnt_ < SYSENT_MAX_ENTITY_TYPES);
        u16 tid = mgr.entity_types_cnt_;
        ++mgr.entity_types_cnt_;
        mgr.entity_types_[tid].init<T>(initial_reserve, mgr.roles_compositions_, mgr.pipelines_);
    }

    template <typename CompTypes, typename T>
    inline void EntityManager::GetCompBufs_::f(EntityManager& emgr, u16 entity_type_id, ChunkedBuffer** comp_bufs) {
        // static
        EntityTypeInfo& eti = emgr.getEntityTypeInfo(entity_type_id);
        u32 comp_pos = eti.getComponentPos<T>();
        comp_bufs[CompTypes::template pos<T>()] = &emgr.getEntitiesPool(entity_type_id).accInnerBuffer(comp_pos);
    }

    template <typename EventType>
    inline u32 EntityManager::getEventId_()const {
        return EventsHandlerTyped::getEventId<EventType>();
    }

    inline void EntityManager::setSubscribedFlagsPositions_(SystemBase* sb) {
        for (u32 fid=0; fid<FlagsMask::size(); ++fid) {
            if (sb->subscribed_flags_[fid]) {
                ASSERT_M(flags_count_ < FlagsMaskLong::size(), "Not enough space in flags mask");
                u32 flag_pos = flags_count_;
                sb->flag_positions_[fid] = flag_pos;
                sb->flag_positions_mask_ |= (1 << flag_pos);

                tracked_flag_bits_[fid] |= (1 << flag_pos);
                flag_bit_to_system_[flag_pos] = sb;

                flags_count_++;
            } else {
                sb->flag_positions_[fid] = InvalidId();
            }
        }
    }

    inline void EntityManager::afterEntityRoleAdded_(Entity& ent, u32 role_id) {
        CBase& ebase = ent.getBase_();
        const RolesComposition& comp = roles_compositions_.getComposition(ebase.roles_composition_id);

        for (u32 plid=0; plid<SYSENT_PIPELINES_CNT; ++plid) {
            LOOP_SET_BITS(comp.compatible_sa_[plid] & systems_for_role_[plid][role_id], it) {
                SystemAll *sa = (SystemAll *) pipelines_[plid].systems[it.getPos()];
                sa->entities_.addEntity(ent.getIndex());
                sa->onEntityAdded(ent, true);
            }

            LOOP_SET_BITS(comp.compatible_ss_[plid] & systems_for_role_[plid][role_id], it2) {
                SystemScheduled *ss = (SystemScheduled *) pipelines_[plid].systems[it2.getPos()];
                // dont add to entities automatically must be scheduled later
                ss->onEntityAdded(ent, true);
            }
        }
    }

    inline void EntityManager::beforeEntityRoleRemoved_(Entity& ent, u32 role_id) {
        CBase& ebase = ent.getBase_();
        const RolesComposition& comp = roles_compositions_.getComposition(ebase.roles_composition_id);

        for (u32 plid=0; plid<SYSENT_PIPELINES_CNT; ++plid) {
            LOOP_SET_BITS(comp.compatible_sa_[plid] & systems_for_role_[plid][role_id], it) {
                SystemAll *sa = (SystemAll *) pipelines_[plid].systems[it.getPos()];
                sa->onEntityRemoved(ent, true);
                sa->entities_.removeEntity(ent.getIndex());
            }

            LOOP_SET_BITS(comp.compatible_ss_[plid] & systems_for_role_[plid][role_id], it2) {
                SystemScheduled *ss = (SystemScheduled *) pipelines_[plid].systems[it2.getPos()];
                ss->onEntityRemoved(ent, true);
                ss->entities_.removeEntity(ent.getIndex());
            }
        }
    }

    inline void EntityManager::beforeEntityKilled_(Entity& ent) {
        CBase& ebase = ent.getBase_();
        const RolesComposition& comp = roles_compositions_.getComposition(ebase.roles_composition_id);

        for (u32 plid=0; plid<SYSENT_PIPELINES_CNT; ++plid) {
            LOOP_SET_BITS(comp.compatible_sa_[plid], it) {
                SystemAll *sa = (SystemAll *) pipelines_[plid].systems[it.getPos()];
                sa->onEntityRemoved(ent, false);
                sa->entities_.removeEntity(ent.getIndex());
            }

            LOOP_SET_BITS(comp.compatible_ss_[plid], it2) {
                SystemScheduled *ss = (SystemScheduled *) pipelines_[plid].systems[it2.getPos()];
                ss->onEntityRemoved(ent, false);
                ss->entities_.removeEntity(ent.getIndex());
            }
        }

        before_entity_killed_(ent);

        EntityTypeCtx& etctx = entity_types_[ent.getIndex().getEntityTypeId()];
        etctx.pool.removeItem(ent.getIndex().getInnerIndex());
    }

    inline void EntityManager::afterEntityCreated_(Entity& ent) {
        const RolesComposition& comp = roles_compositions_.getComposition(ent.getBase_().roles_composition_id);
        for (u32 plid=0; plid<SYSENT_PIPELINES_CNT; ++plid) {
            LOOP_SET_BITS(comp.compatible_sa_[plid], it) {
                SystemAll *sa = (SystemAll *) pipelines_[plid].systems[it.getPos()];
                sa->entities_.addEntity(ent.getIndex());
                sa->onEntityAdded(ent, true);
            }

            LOOP_SET_BITS(comp.compatible_ss_[plid], it2) {
                SystemScheduled *ss = (SystemScheduled *) pipelines_[plid].systems[it2.getPos()];
                // dont add to entities automatically must be scheduled later
                ss->onEntityAdded(ent, false);
            }
        }
    }

}