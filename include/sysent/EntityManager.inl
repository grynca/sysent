#include "EntityManager.h"
#include "Entity.h"
#include "SystemBase.h"
#include <types/Type.h>
#include <iomanip>

namespace grynca {

    inline EntityManager::~EntityManager() {
        for (uint32_t i=0; i<systems_packs_.size(); ++i) {
            SystemsPack& sp = systems_packs_[i];
            for (uint32_t j = 0; j < sp.size(); ++j) {
                delete sp[j];
            }
        }
    }

    inline EntityManager::EntityManager()
     : flags_count_(0), flag_bits_(MAX_FLAGS)
    {
    }

    template <typename EntityTypes>
    inline void EntityManager::init(uint32_t initial_reserve, uint32_t system_packs_count) {
        EntityTypes::template callOnTypes<EntityTypesInitializer_>(*this, initial_reserve);
        systems_packs_.resize(system_packs_count);
        deferred_add_to_systems_.resize(system_packs_count);


#ifdef DEBUG_BUILD
        std::cout << "Component types:" << std::endl;
        std::cout << InternalTypes<EntityTypeInfo>::getDebugString(" ");

        std::cout << "Entity types:" << std::endl;
        for (uint32_t i=0; i<entity_types_.size(); ++i) {
            uint32_t internal_type_id = *std::find(type_ids_map_.begin(), type_ids_map_.end(), i);
            const TypeInfo& ti = InternalTypes<EntityManager>::getInfo(internal_type_id);
            EntityTypeInfo& eti = entity_types_[i].ent_type_info_;
            std::cout << (" " +std::to_string(i) + "[" + std::to_string(internal_type_id) + "]: " + ti.getTypename()) << std::endl
                      << "  roles:" << eti.getComponentRoles()
                      << ", size: " << eti.getComponentsSize()
                      << ", components: ";
            fast_vector<uint32_t> cc = eti.getContainedComponents();
            for (uint32_t j=0; j<cc.size(); ++j) {
                if (j != 0)
                    std::cout << ", ";
                std::cout << std::to_string(cc[j]);
            }
            std::cout << std::endl;
        }
#endif
    }

    inline Entity EntityManager::createEntity(uint16_t entity_type_id) {
        EntityTypeCtx& etctx = entity_types_[entity_type_id];

        uint8_t* comps_data;
        EntityIndex id;
        id.index_ = etctx.components_data_.add(comps_data);
        id.setEntityTypeId_(entity_type_id);

        Entity new_ent;
        new_ent.comps_data_ = comps_data;
        new_ent.index_ = id;
        new_ent.mgr_ = this;
        etctx.ent_type_info_.callCompsDefConstructor(new_ent);
        new_ent.getBase_().roles_ = etctx.ent_type_info_.getComponentRoles();

        for (uint32_t i=0; i<systems_packs_.size(); ++i) {
            deferred_add_to_systems_[i].push_back(new_ent);
        }
        return new_ent;
    }

    inline Entity EntityManager::getEntity(EntityIndex id) {
        EntityTypeCtx& etctx = entity_types_[id.getEntityTypeId()];

        Entity ent;
        ent.mgr_ = this;
        ent.index_ = id;
        ent.comps_data_ = etctx.components_data_.get(id.index_);
        return ent;
    }

    inline Entity EntityManager::tryGetEntity(EntityIndex id) {
        Entity ent;
        if (id.getEntityTypeId() >= entity_types_.size())
            return ent;

        EntityTypeCtx& etctx = entity_types_[id.getEntityTypeId()];

        if (!etctx.components_data_.isValidIndex(id.index_))
            return ent;

        ent.mgr_ = this;
        ent.index_ = id;
        ent.comps_data_ = etctx.components_data_.get(id.index_);
        return ent;
    }

    inline EntityTypeInfo& EntityManager::getEntityTypeInfo(uint16_t entity_type_id) {
        return entity_types_[entity_type_id].ent_type_info_;
    }

    template <typename SystemType>
    inline SystemType& EntityManager::addSystem(uint32_t systems_pack_id) {
        ASSERT(systems_pack_id < systems_packs_.size());

        SystemType* system = new SystemType();
        system->template init_<SystemType>(*this, entity_types_.size(), flags_count_);
        systems_packs_[systems_pack_id].push_back(system);

        FlagsMask fm = system->getTrackedFlags();
        for (uint32_t fid=0; fid<MAX_FLAGS; ++fid) {
            if (fm[fid]) {
                flag_bits_[fid] |= (1<<system->getFlagPosition_(fid));
            }
        }

        return *system;
    }

    inline SystemBase* EntityManager::getSystem(uint32_t systems_pack_id, uint32_t system_id) {
        return systems_packs_[systems_pack_id][system_id];
    }

    inline uint32_t EntityManager::getSystemsPackSize(uint32_t systems_pack_id) {
        return systems_packs_[systems_pack_id].size();
    }

    inline void EntityManager::updateSystemsPack(uint32_t systems_pack_id, float dt) {
        ASSERT(systems_pack_id < systems_packs_.size());

        if (!deferred_add_to_systems_[systems_pack_id].empty()) {
            uint32_t def_cnt = deferred_add_to_systems_[systems_pack_id].size();
            for (uint32_t i=0; i<def_cnt; ++i) {
                // add entities to systems
                Entity& ent = deferred_add_to_systems_[systems_pack_id][i];
                for (uint32_t j=0; j<systems_packs_[systems_pack_id].size(); ++j) {
                    SystemBase* s = systems_packs_[systems_pack_id][j];
                    if (!s->careAboutEntity(ent))
                        continue;
                    addEntityToSystemInternal_(ent, s);
                }
            }
            deferred_add_to_systems_[systems_pack_id].clear();
        }

        for (uint32_t i=0; i<systems_packs_[systems_pack_id].size(); ++i) {
            // preupdate
            // update system
            SystemBase* s = systems_packs_[systems_pack_id][i];
            update_ctx_.system = s;
            s->preUpdate();
            Entity ent;
            ent.mgr_ = this;
            for (uint16_t et_id=0; et_id<s->relevant_entities_.size(); ++et_id) {
                EntityTypeCtx& etctx = entity_types_[et_id];
                fast_vector<uint32_t>& rel_ents = s->relevant_entities_[et_id];
                ent.index_.setEntityTypeId_(et_id);
                update_ctx_.entity_type_id = et_id;

                uint32_t& pos = update_ctx_.entity_pos;
                for (pos=0; pos<rel_ents.size(); ++pos) {
                    etctx.components_data_.getIndexForPos2(rel_ents[pos], ent.index_.index_);
                    ent.comps_data_ = etctx.components_data_.get(ent.index_.index_);
                    s->updateEntity(ent, dt);
                    ent.clearTrackedFlagsForSystem_(s);
                }
                // handle deferred entities
                if (!update_ctx_.defered_created_entity_positions_.empty()) {
                    for (uint32_t j=0; j<update_ctx_.defered_created_entity_positions_.size(); ++j) {
                        pos = update_ctx_.defered_created_entity_positions_[j];
                        etctx.components_data_.getIndexForPos2(rel_ents[pos], ent.index_.index_);
                        ent.comps_data_ = etctx.components_data_.get(ent.index_.index_);
                        s->updateEntity(ent, dt);
                        ent.clearTrackedFlagsForSystem_(s);
                    }
                    update_ctx_.defered_created_entity_positions_.clear();
                }
            }
            update_ctx_.entity_pos = uint32_t(-1);
            s->postUpdate();

            update_ctx_.system = NULL;
        }
    }

    inline void EntityManager::addEntityToSystemInternal_(Entity& ent, SystemBase* system) {
        uint32_t pos = system->addRelevantEntity(ent);
        if (system == update_ctx_.system
            && update_ctx_.entity_type_id == ent.getIndex().getEntityTypeId()
            && pos <= update_ctx_.entity_pos)
        {
            ++update_ctx_.entity_pos;
            // make sure this entity gets updated by this system
            // even when inserted before current update cursor
            update_ctx_.defered_created_entity_positions_.push_back(pos);
        }
    }

    inline void EntityManager::removeEntityFromSystems_(Entity& ent) {
        for (uint32_t i=0; i<systems_packs_.size(); ++i) {
            for (uint32_t j=0; j<systems_packs_[i].size(); ++j) {
                SystemBase* s = systems_packs_[i][j];
                if (!s->careAboutEntity(ent))
                    continue;
                removeEntityFromSystemInternal_(ent, s);
            }
        }
    }

    inline void EntityManager::removeEntityFromSystemInternal_(Entity& ent, SystemBase* system) {
        uint32_t pos = system->removeRelevantEntity(ent);
        if (system == update_ctx_.system
            && update_ctx_.entity_type_id == ent.getIndex().getEntityTypeId()
            && pos <= update_ctx_.entity_pos)
        {
            --update_ctx_.entity_pos;
        }
    }

    inline void EntityManager::beforeEntityRolesChanged_(Entity& ent, const RolesMask& new_roles) {
        for (uint32_t i=0; i<systems_packs_.size(); ++i) {
            for (uint32_t j = 0; j < systems_packs_[i].size(); ++j) {
                SystemBase *s = systems_packs_[i][j];
                bool did_care = s->careAboutEntity(ent);
                bool will_care = (new_roles&s->needed_roles_) == s->needed_roles_;
                if (did_care && !will_care) {
                    removeEntityFromSystemInternal_(ent, s);
                }
                else if (!did_care && will_care) {
                    addEntityToSystemInternal_(ent, s);
                }
            }
        }
    }

}