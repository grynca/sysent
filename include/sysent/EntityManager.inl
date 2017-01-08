#include "EntityManager.h"
#include "Entity.h"
#include "FlaggedSystem.h"
#include <types/Type.h>

namespace grynca {

    inline EntityManager::~EntityManager() {
        for (u32 i=0; i<SYSENT_PIPELINES_CNT; ++i) {
            SystemsPipeline& sp = pipelines_[i];
            for (u32 j = 0; j < sp.systems_.size(); ++j) {
                delete sp.systems_[j];
            }
        }
    }

    inline EntityManager::EntityManager()
     : flags_count_(0)
    {
    }

    template <typename EntityTypes>
    inline void EntityManager::init(u32 initial_reserve) {
        EntityTypes::template callOnTypes<EntityTypesInitializer_>(*this, initial_reserve);

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
        new_ent.getBase_().roles_mask_id_ = role_masks_.getId(etctx.info_.getInitialComponentRoles(), pipelines_);
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

    template <typename SystemType>
    inline SystemType& EntityManager::addSystem(u32 pipeline_id) {
        ASSERT(pipeline_id < SYSENT_PIPELINES_CNT);

        SystemType* system = new SystemType();
        System* s = (System*)system;
        u32 system_id = pipelines_[pipeline_id].systems_.size();
        pipelines_[pipeline_id].systems_.push_back(s);

        s->init_(*this, (u16)entity_types_.size(), pipeline_id, system_id, flags_count_);

        FlagsMask tf = s->getTrackedFlags();
        if (s->isFlaggedSystem()) {
            tf |= ((FlaggedSystem*)s)->getNeededFlags();
        }
        for (uint32_t fid=0; fid<FlagsMask::size(); ++fid) {
            if (tf[fid]) {
                tracked_flag_bits_[fid] |= (1<<s->getFlagPosition_(fid));
            }
        }

        for (u32 i=0; i<role_masks_.getInfosCount(); ++i) {
            RoleMasks::RolesMaskInfo& rmi = role_masks_.getInfo(i);
            rmi.addForSystem(s);
        }

        return *system;
    }

    template <typename SystemType>
    SystemType* EntityManager::findSystemByType(u32 pipeline_id) {
        for (u32 i=0; i< pipelines_[pipeline_id].systems_.size(); ++i) {
            SystemType* st = dynamic_cast<SystemType*>(pipelines_[pipeline_id].systems_[i]);
            if (st) {
                return st;
            }
        }
        return NULL;
    }

    inline System* EntityManager::getSystem(u32 pipeline_id, u32 system_id) {
        ASSERT(pipeline_id < SYSENT_PIPELINES_CNT);
        return pipelines_[pipeline_id].systems_[system_id];
    }

    inline u32 EntityManager::getSystemsPipelineSize(u32 pipeline_id) {
        ASSERT(pipeline_id < SYSENT_PIPELINES_CNT);
        return pipelines_[pipeline_id].systems_.size();
    }

    inline void EntityManager::updateSystemsPipeline(u32 pipeline_id, f32 dt) {
        ASSERT(pipeline_id < SYSENT_PIPELINES_CNT);

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
        for (u32 pid = 0; pid<SYSENT_PIPELINES_CNT; ++pid) {
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

    inline void EntityManager::RoleMasks::RolesMaskInfo::addForSystem(System* s) {
        if (!s->areRolesCompatible(mask_))
            return;

        caring_systems_.push_back(s);
        if (s->isFlaggedSystem()) {
            FlaggedSystem* fs = (FlaggedSystem*)s;
            const FlagsMask& nf = fs->getNeededFlags();
            for (u32 fid=0; fid<FlagsMask::size(); ++fid) {
                if (nf[fid]) {
                    needs_flag_[fid].push_back(fs);
                }
            }
        }

        const RolesMask& nr = s->getNeededRoles();
        for (u32 rid=0; rid<RolesMask::size(); ++rid) {
            if (nr[rid]) {
                needs_role_[rid].push_back(s);
            }
        }
    }

    inline u32 EntityManager::RoleMasks::getId(const RolesMask& mask, SystemsPipeline* pipelines) {
        u32 info_id = 0;
        for (; info_id<rm_infos_.size(); ++info_id) {
            if (rm_infos_[info_id].mask_ == mask)
                break;
        }

        bool found = info_id!=rm_infos_.size();
        if (!found) {
            rm_infos_.emplace_back();
            RolesMaskInfo& rmi = rm_infos_.back();
            rmi.mask_ = mask;
            for (u32 i=0; i<SYSENT_PIPELINES_CNT; ++i) {
                for (u32 j=0; j<pipelines[i].systems_.size(); ++j) {
                    System* s = pipelines[i].systems_[j];
                    rmi.addForSystem(s);
                }
            }
        }
        return info_id;
    }

    inline void EntityManager::afterEntityRoleAdded_(Entity& ent, u32 role_id) {
        RoleMasks::RolesMaskInfo& rmi = role_masks_.getInfo(ent.getBase_().roles_mask_id_);
        for (u32 j=0; j<rmi.needs_role_[role_id].size(); ++j) {
            rmi.needs_role_[role_id][j]->addEntity_(ent);
        }
    }

    inline void EntityManager::beforeEntityRoleRemoved_(Entity& ent, u32 role_id) {
        RoleMasks::RolesMaskInfo& rmi = role_masks_.getInfo(ent.getBase_().roles_mask_id_);
        for (u32 j=0; j<rmi.needs_role_[role_id].size(); ++j) {
            rmi.needs_role_[role_id][j]->removeEntity_(ent);
        }
    }

    inline void EntityManager::beforeEntityKilled_(Entity& ent) {
        RoleMasks::RolesMaskInfo& rmi = role_masks_.getInfo(ent.getBase_().roles_mask_id_);
        for (u32 i=0; i<rmi.caring_systems_.size(); ++i) {
            rmi.caring_systems_[i]->removeEntity_(ent);
        }
    }

    inline void EntityManager::afterEntityCreated_(Entity& ent) {
        RoleMasks::RolesMaskInfo& rmi = role_masks_.getInfo(ent.getBase_().roles_mask_id_);
        for (u32 i=0; i<rmi.caring_systems_.size(); ++i) {
            rmi.caring_systems_[i]->addEntity_(ent);
        }
    }

    template <typename EntType>
    inline void EntityManager::EntityTypeCtx::init(u32 initial_reserve) {
        info_.init<EntType>();
        comps_pool.initComponents<typename EntType::ComponentTypes>();
        comps_pool.reserve(initial_reserve);
    }

}