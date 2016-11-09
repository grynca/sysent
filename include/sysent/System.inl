#include "System.h"
#include "EntityManager.h"

namespace grynca {

    inline System::System(Subtype st)
     : manager_(NULL), subtype_(st), pipeline_id_(InvalidId()), u_et_id_((u16)InvalidId()), u_pos_(InvalidId())
    {
    }

    inline System::~System()
    {
    }

    inline EntityManager& System::getEntityManager() {
        return *manager_;
    }

    inline bool System::careAboutEntity(Entity& e) {
        return (e.getRoles()&needed_roles_) == needed_roles_;
    }

    inline void System::resolveEntityFlag(Entity& e, u32 flag_id)const {
        manager_->resolveEntityFlag(e, flag_id, pipeline_id_);
    }

    inline bool System::isEntAtPos_(Entities& ents, Entity& ent, u32 pos) {
        fast_vector<u32>& rel_ents = ents[ent.getIndex().getEntityTypeId()];
        if (pos >=  rel_ents.size())
            return false;
        return rel_ents[pos] == ent.getIndex().getEntityIndex();
    }


    inline void System::addEntity_(Entity& e) {
        ASSERT(careAboutEntity(e));
        if (getSubtype() == stLoopAll) {
            EntityIndex entity_id = e.getIndex();
            if (entity_id.getEntityTypeId() == u_et_id_)
                deferred_add_.push_back(e);
            else
                innerAdd_(e);
        }
        else {
            afterAddedEntity(e);
        }
    }

    inline void System::removeEntity_(Entity& e) {
        EntityIndex entity_id = e.getIndex();
        if (entity_id.getEntityTypeId() == u_et_id_) {
            deferred_remove_.push_back(e);
        }
        else {
            innerRemove_(e);
        }
    }

    inline void System::update_(Entity& e, f32 dt) {
        PROFILE_MEASURE_FROM(pre_update_m_);
        preUpdate();
        PROFILE_MEASURE_TO(pre_update_m_);

        PROFILE_MEASURE_FROM(update_m_);
        for (u_et_id_=0; u_et_id_<relevant_entities_.size(); ++u_et_id_) {
            EntityManager::EntityTypeCtx& etctx = manager_->entity_types_[u_et_id_];
            fast_vector<u32>& rel_ents = relevant_entities_[u_et_id_];
            e.index_.setEntityTypeId(u_et_id_);

            for (u_pos_ = 0; u_pos_<rel_ents.size(); ++u_pos_) {
                etctx.comps_pool.getIndexForPos2(rel_ents[u_pos_], e.index_.accInnerIndex());
                updateEntity(e, dt);
            }

            if (!deferred_add_.empty()) {
                for (u32 i=0; i<deferred_add_.size(); ++i) {
                    innerAdd_(deferred_add_[i]);
                }
                deferred_add_.clear();
            }
            if (!deferred_remove_.empty()) {
                for (u32 i=0; i<deferred_remove_.size(); ++i) {
                    innerRemove_(deferred_remove_[i]);
                }
                deferred_remove_.clear();
            }
        }
        u_pos_ = u32(-1);
        PROFILE_MEASURE_TO(update_m_);

        PROFILE_MEASURE_FROM(post_update_m_);
        postUpdate();
        PROFILE_MEASURE_TO(post_update_m_);
    }

    inline void System::init_(EntityManager& mgr, u16 entity_types_count, u32 pipeline_id) {
        manager_ = &mgr;
        pipeline_id_ = pipeline_id;
        needed_roles_ = NeededRoles();
        relevant_entities_.resize(entity_types_count);
        init();
    }

    inline void System::innerAdd_(Entity& e) {
        EntityIndex entity_id = e.getIndex();
        fast_vector<u32>& rel_ents = relevant_entities_[entity_id.getEntityTypeId()];
        u32 pos = bisectFindInsert(rel_ents, entity_id.getEntityIndex());
        ASSERT_M(!isEntAtPos_(relevant_entities_, e, pos), "Already contained in system.");
        rel_ents.insert(rel_ents.begin() + pos, entity_id.getEntityIndex());
        afterAddedEntity(e);
    }

    inline void System::innerRemove_(Entity& e) {
        beforeRemovedEntity(e);
        EntityIndex entity_id = e.getIndex();
        fast_vector<u32>& rel_ents = relevant_entities_[entity_id.getEntityTypeId()];
        u32 pos = bisectFind(rel_ents, entity_id.getEntityIndex());
        if (pos != InvalidId()) {
            rel_ents.erase(rel_ents.begin() + pos);
        }
    }

}