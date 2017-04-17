#include "EntityManager.h"
#include "Entity.h"
#include "SystemAll.h"
#include <types/Type.h>

namespace grynca {

    inline EntityManager::~EntityManager() {
        for (u32 i=0; i<SYSENT_PIPELINES_CNT; ++i) {
            SystemsPipeline& sp = pipelines_[i];
            for (u32 j = 0; j < sp.systems.size(); ++j) {
                delete sp.systems[j];
            }
        }
    }

    inline EntityManager::EntityManager()
     : flags_count_(0)
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

    inline u32 EntityManager::getTypesCount()const {
        return u32(entity_types_.size());
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

    inline Entity EntityManager::getEntity(EntityIndex id) {
        Entity ent;
        ent.mgr_ = this;
        ent.index_ = id;
        return ent;
    }

    inline Entity EntityManager::tryGetEntity(EntityIndex id) {
        Entity ent;
        if (id.getEntityTypeId() >= entity_types_.size())
            return ent;

        EntityTypeCtx& etctx = entity_types_[id.getEntityTypeId()];

        if (!etctx.pool.isValidIndex(id.accInnerIndex()))
            return ent;

        ent.mgr_ = this;
        ent.index_ = id;
        return ent;
    }

    inline EntityTypeInfo& EntityManager::getEntityTypeInfo(u16 entity_type_id) {
        return entity_types_[entity_type_id].info;
    }

    inline u32 EntityManager::getEntityTypesCount()const {
        return u32(entity_types_.size());
    }

    inline EntitiesPool& EntityManager::getEntitiesPool(u16 entity_type_id) {
        return entity_types_[entity_type_id].pool;
    }

    template <typename SystemType, typename... ConstrArgs>
    inline SystemType& EntityManager::addSystem(u32 pipeline_id, ConstrArgs&&... args) {
        ASSERT(pipeline_id < SYSENT_PIPELINES_CNT);
        ASSERT_M(!getSystemByType<SystemType>(pipeline_id), "System already contained in this pipeline");
        ASSERT(pipelines_[pipeline_id].systems.size() < SYSENT_MAX_SYSTEMS_PER_PIPELINE);

        SystemType* system = new SystemType(std::forward<ConstrArgs>(args)...);
        SystemBase* sb = (SystemBase*)system;
        u32 system_id = u32(pipelines_[pipeline_id].systems.size());
        pipelines_[pipeline_id].systems.push_back(sb);

        u32 int_sys_type_id = Type<SystemType, EntityManager>::getInternalTypeId();
        if (int_sys_type_id >= pipelines_[pipeline_id].systems_by_type.size()) {
            pipelines_[pipeline_id].systems_by_type.resize(int_sys_type_id+1, NULL);
        }
        pipelines_[pipeline_id].systems_by_type[int_sys_type_id] = sb;

        sb->init_(*this, (u16)entity_types_.size(), pipeline_id, system_id, flags_count_);

        for (u32 i=0; i<roles_compositions_.getInfosCount(); ++i) {
            roles_compositions_.accComposition(i).addForSystem(sb);
        }

        LOOP_SET_BITS(sb->getNeededRoles(), it) {
            systems_for_role_[pipeline_id][it.getPos()].set(system_id);
        }

        LOOP_SET_BITS(sb->getTrackedFlags(), it2) {
            u32 flag_bit = sb->getFlagPosition_(it2.getPos());
            tracked_flag_bits_[it2.getPos()] |= (1<<flag_bit);
            flag_bit_to_system_[flag_bit] = sb;
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
                if (!to_create_.empty()) {
                    for (Entity e : to_create_) {
                        afterEntityCreated_(e);
                    }
                    to_create_.clear();
                }
                if (!to_remove_.empty()) {
                    for (Entity e : to_remove_) {
                        beforeEntityKilled_(e);
                    }
                    to_remove_.clear();
                }
                sb->update_(dt);
            }
        }
    }

    inline ustring EntityManager::getTypesDebugString()const {
        std::ostringstream ss;
        ss << "Component types:" << std::endl;
        ss << InternalTypes<EntityTypeInfo>::getDebugString(" ");

        std::cout << "Entity types:" << std::endl;
        for (u32 i=0; i<entity_types_.size(); ++i) {
            u32 internal_type_id = u32(std::find(type_ids_map_.begin(), type_ids_map_.end(), i) - type_ids_map_.begin());
            const TypeInfo& ti = InternalTypes<EntityManager>::getInfo(internal_type_id);
            const EntityTypeInfo& eti = entity_types_[i].info;
            ss << (" " +ssu::toStringA(i) + "[" + ssu::toStringA(internal_type_id) + "]: " + ti.getTypename().cpp_str()) << std::endl
               << "  roles:" << eti.getInitialComponentRoles().to_string()
               << ", size: " << eti.getComponentsSize()
               << ", components: ";
            fast_vector<u32> cc = eti.getContainedComponents();
            for (u32 j=0; j<cc.size(); ++j) {
                if (j != 0)
                    ss << ", ";
                ss << ssu::toString(cc[j]);
            }
            ss << std::endl;
        }
        return ss.str();
    }

    template <typename EntityTypes, typename T>
    inline void EntityManager::EntityTypesInitializer_::f(EntityManager& mgr, u32 initial_reserve) {
        //static
        u32 tid = u32(mgr.entity_types_.size());
        mgr.entity_types_.emplace_back();
        mgr.entity_types_.back().init<T>(initial_reserve, mgr.roles_compositions_, mgr.pipelines_);

        u32 internal_tid = Type<T, EntityManager>::getInternalTypeId();
        if (internal_tid  >= mgr.type_ids_map_.size())
            mgr.type_ids_map_.resize(internal_tid+1, InvalidId());
        mgr.type_ids_map_[internal_tid] = tid;
    }

    template <typename EventType>
    inline u32 EntityManager::getEventId_()const {
        return EventsHandlerTyped::getEventId<EventType>();
    }

    inline void EntityManager::afterEntityRoleAdded_(Entity& ent, u32 role_id) {
        CBaseData& ebase = ent.getBase_();
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
        CBaseData& ebase = ent.getBase_();
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
        CBaseData& ebase = ent.getBase_();
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
        EntityTypeCtx& etctx = entity_types_[ent.getIndex().getEntityTypeId()];
        etctx.pool.remove(ent.getIndex().getInnerIndex());
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