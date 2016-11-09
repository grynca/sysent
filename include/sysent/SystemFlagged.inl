#include "SystemFlagged.h"

namespace grynca {

    inline void SystemFlagged::addFlaggedEntity_(Entity& e, FlagsMask& curr_flags) {
        ASSERT(careAboutEntity(e));
        EntityIndex entity_id = e.getIndex();
        fast_vector<u32>& rel_ents = relevant_entities_[entity_id.getEntityTypeId()];

        if (flags_any_) {
            // any one of flags must be set
            if (rel_ents.empty() || rel_ents.back()!=entity_id.getEntityIndex()) {
                // add flagged entity only once
                rel_ents.push_back(entity_id.getEntityIndex());
            }

        }
        else if ((getNeededFlags()&curr_flags) == getNeededFlags()) {
            // all of flags must be set
            ASSERT_M(rel_ents.empty() || rel_ents.back() < entity_id.getEntityIndex(), "Must add entity with highest id");
            rel_ents.push_back(entity_id.getEntityIndex());
        }
    }

    inline void SystemFlagged::update_(Entity& e, f32 dt) {
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
            if (!deferred_remove_.empty()) {
                for (u32 i=0; i<deferred_remove_.size(); ++i) {
                    innerRemove_(deferred_remove_[i]);
                }
                deferred_remove_.clear();
            }
            relevant_entities_[u_et_id_].clear();
        }
        u_pos_ = u32(-1);
        PROFILE_MEASURE_TO(update_m_);

        PROFILE_MEASURE_FROM(post_update_m_);
        postUpdate();
        PROFILE_MEASURE_TO(post_update_m_);
    }

    inline void SystemFlagged::init_(EntityManager& mgr, u16 entity_types_count, u32 pipeline_id) {
        ASSERT_M(NeededFlagsAll().any() || NeededFlagsAny().any(), "You must set needed flags.");
        ASSERT_M(!NeededFlagsAll().any() || !NeededFlagsAny().any(), "You cant set both ALL and ANY.");
        subtype_ = stLoopFlagged;
        flags_any_ = NeededFlagsAny().any();
        if (flags_any_)
            needed_flags_ = NeededFlagsAny();
        else
            needed_flags_ = NeededFlagsAll();
        System::init_(mgr, entity_types_count, pipeline_id);
    }
}