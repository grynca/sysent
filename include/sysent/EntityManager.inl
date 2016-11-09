#include "EntityManager.h"
#include "Entity.h"
#include "SystemFlagged.h"
#include <types/Type.h>

namespace grynca {

    inline EntityManager::~EntityManager() {
        for (u32 i=0; i<pipelines_.size(); ++i) {
            SystemsPipeline& sp = pipelines_[i];
            for (u32 j = 0; j < sp.systems_.size(); ++j) {
                delete sp.systems_[j];
            }
        }
    }

    inline EntityManager::EntityManager()
    {
    }

    template <typename EntityTypes>
    inline void EntityManager::init(u32 initial_reserve, u32 system_pipelines_count) {
        EntityTypes::template callOnTypes<EntityTypesInitializer_>(*this, initial_reserve);
        pipelines_.resize(system_pipelines_count);
        for (u32 i=0; i<system_pipelines_count; ++i) {
            pipelines_[i].needs_flag_.resize(FlagsMask::size());
            pipelines_[i].needs_role_.resize(RolesMask::size());
        }

#ifdef DEBUG_BUILD
        std::cout << "Component types:" << std::endl;
        std::cout << InternalTypes<EntityTypeInfo>::getDebugString(" ");

        std::cout << "Entity types:" << std::endl;
        for (u32 i=0; i<entity_types_.size(); ++i) {
            u32 internal_type_id = std::find(type_ids_map_.begin(), type_ids_map_.end(), i) - type_ids_map_.begin();
            const TypeInfo& ti = InternalTypes<EntityManager>::getInfo(internal_type_id);
            EntityTypeInfo& eti = entity_types_[i].info_;
            std::cout << (" " +string_utils::toString(i) + "[" + string_utils::toString(internal_type_id) + "]: " + ti.getTypename()) << std::endl
                      << "  roles:" << eti.getInitialComponentRoles()
                      << ", size: " << eti.getComponentsSize()
                      << ", components: ";
            fast_vector<u32> cc = eti.getContainedComponents();
            for (u32 j=0; j<cc.size(); ++j) {
                if (j != 0)
                    std::cout << ", ";
                std::cout << string_utils::toString(cc[j]);
            }
            std::cout << std::endl;
        }
#endif
    }

    inline Entity EntityManager::newEntity(u16 entity_type_id) {
        EntityTypeCtx& etctx = entity_types_[entity_type_id];

        EntityIndex id;
        id.accInnerIndex() = etctx.comps_pool.addAndConstruct();
        id.setEntityTypeId(entity_type_id);

        Entity new_ent;
        new_ent.index_ = id;
        new_ent.mgr_ = this;
        new_ent.getBase_().roles_ = etctx.info_.getInitialComponentRoles();
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

        if (!etctx.comps_pool.isValidIndex(id.accInnerIndex()))
            return ent;

        ent.mgr_ = this;
        ent.index_ = id;
        return ent;
    }

    inline EntityTypeInfo& EntityManager::getEntityTypeInfo(u16 entity_type_id) {
        return entity_types_[entity_type_id].info_;
    }

    inline EntityManager::EntitiesPool& EntityManager::getEntitiesPool(u16 entity_type_id) {
        return entity_types_[entity_type_id].comps_pool;
    }

    inline void EntityManager::resolveEntityFlag(Entity& e, u32 flag_id, u32 pipeline_id) {
        FlagsMask& next = e.accNextFlags();
        FlagsMask& curr = e.accFlags();
        curr[flag_id] = next[flag_id];
        if (!next[flag_id])
            return;
        next[flag_id] = 0;
        for (u32 i=0; i<pipelines_[pipeline_id].needs_flag_[flag_id].size(); ++i) {
            u32 sys_id = pipelines_[pipeline_id].needs_flag_[flag_id][i];
            SystemFlagged* slf = (SystemFlagged*)(pipelines_[pipeline_id].systems_[sys_id]);
            slf->addFlaggedEntity_(e, curr);
        }
    }

    template <typename SystemType>
    inline SystemType& EntityManager::addSystem(u32 pipeline_id) {
        ASSERT(pipeline_id < pipelines_.size());

        SystemType* system = new SystemType();
        System* sb = (System*)system;
        sb->init_(*this, (u16)entity_types_.size(), pipeline_id);
        u32 sys_id = pipelines_[pipeline_id].systems_.size();
        pipelines_[pipeline_id].systems_.push_back(sb);

        const RolesMask& nr = sb->getNeededRoles();
        for (u32 i=0; i<RolesMask::size(); ++i) {
            if (nr[i]) {
                pipelines_[pipeline_id].needs_role_[i].push_back(sys_id);
            }
        }

        if (sb->getSubtype() == System::stLoopFlagged) {
            const FlagsMask& nf = ((SystemFlagged*)sb)->getNeededFlags();
            for (u32 i=0; i< FlagsMask::size(); ++i) {
                if (nf[i]) {
                    pipelines_[pipeline_id].needs_flag_[i].push_back(sys_id);
                }
            }
            pipelines_[pipeline_id].loop_flagged_.push_back(sys_id);
        }
        else {
            pipelines_[pipeline_id].loop_all_.push_back(sys_id);
        }

        return *system;
    }

    inline System* EntityManager::getSystem(u32 pipeline_id, u32 system_id) {
        return pipelines_[pipeline_id].systems_[system_id];
    }

    inline u32 EntityManager::getSystemsPipelineSize(u32 pipeline_id) {
        return pipelines_[pipeline_id].systems_.size();
    }

    inline void EntityManager::updateSystemsPipeline(u32 pipeline_id, f32 dt) {
        ASSERT(pipeline_id < pipelines_.size());

        Entity ent;
        ent.mgr_ = this;
        for (u32 i=0; i<pipelines_[pipeline_id].systems_.size(); ++i) {
            System* s = pipelines_[pipeline_id].systems_[i];
            s->update_(ent, dt);
        }
    }

#ifdef PROFILE_BUILD
    inline std::string EntityManager::getProfileString() {
        struct UpdateTimes {
            f32 pre_upd;
            f32 upd;
            f32 post_upd;
        };

        std::string rslt;
        for (u32 pid = 0; pid<pipelines_.size(); ++pid) {
            u32 systems_cnt = pipelines_[pid].systems_.size();
            fast_vector<UpdateTimes> times;
            times.resize(systems_cnt);
            f32 all_time = 0;
            for (u32 sid = 0; sid< systems_cnt; ++sid) {
                times[sid].pre_upd = pipelines_[pid].systems_[sid]->getPreUpdateMeasure().calcAvgDt();
                times[sid].upd = pipelines_[pid].systems_[sid]->getUpdateMeasure().calcAvgDt();
                times[sid].post_upd = pipelines_[pid].systems_[sid]->getPostUpdateMeasure().calcAvgDt();
                all_time += times[sid].pre_upd;
                all_time += times[sid].upd;
                all_time += times[sid].post_upd;
            }
            rslt += "pipeline " + string_utils::toString(pid) + ": \n";
            for (u32 sid = 0; sid< systems_cnt; ++sid) {
                rslt += " system " + string_utils::toString(sid)
                        + ": pre_update: "+ string_utils::printPerc(times[sid].pre_upd/all_time)
                        + " %, update: "+ string_utils::printPerc(times[sid].upd/all_time)
                        + " %, post_update: " + string_utils::printPerc(times[sid].post_upd/all_time) + " %. \n";
            }
        }
        return rslt;
    }
#endif

    inline void EntityManager::beforeEntityRoleAdded_(Entity& ent, u32 role_id) {
        for (u32 i=0; i<pipelines_.size(); ++i) {
            SystemsPipeline& pl = pipelines_[i];
            for (u32 j=0; j<pl.needs_role_[role_id].size(); ++j) {
                u32 sys_id = pl.needs_role_[role_id][j];
                System* s = pl.systems_[sys_id];
                if (s->careAboutEntity(ent)) {
                    s->addEntity_(ent);
                }
            }
        }
    }

    inline void EntityManager::beforeEntityRoleRemoved_(Entity& ent, u32 role_id) {
        for (u32 i=0; i<pipelines_.size(); ++i) {
            SystemsPipeline& pl = pipelines_[i];
            for (u32 j=0; j<pl.needs_role_[role_id].size(); ++j) {
                u32 sys_id = pl.needs_role_[role_id][j];
                System* s = pl.systems_[sys_id];
                if (s->careAboutEntity(ent)) {
                    s->removeEntity_(ent);
                }
            }
        }
    }

    inline void EntityManager::beforeEntityKilled_(Entity& ent) {
        for (u32 i=0; i<pipelines_.size(); ++i) {
            for (u32 j=0; j<pipelines_[i].systems_.size(); ++j) {
                System* s = pipelines_[i].systems_[j];
                if (!s->careAboutEntity(ent))
                    continue;
                s->removeEntity_(ent);
            }
        }
    }

    inline void EntityManager::afterEntityCreated_(Entity& ent) {
        for (u32 i=0; i<pipelines_.size(); ++i) {
            // add only to loop all systems
            for (u32 j=0; j<pipelines_[i].systems_.size(); ++j) {
                System* s = pipelines_[i].systems_[j];
                if (!s->careAboutEntity(ent))
                    continue;
                s->addEntity_(ent);
            }
        }
    }

    template <typename EntType>
    inline void EntityManager::EntityTypeCtx::init(u32 initial_reserve) {
        info_.init<EntType>();
        comps_pool.initComponents<typename EntType::ComponentTypes>();
        comps_pool.reserve(initial_reserve);
    }

}