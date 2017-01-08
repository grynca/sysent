#include "FlaggedSystem.h"

namespace grynca {

    inline FlaggedSystem::FlaggedSystem()
    {
        is_flagged_system_ = true;
        sort_before_upd_ = [] (u16, fast_vector<u32>&) {
            // no-op
        };
    }

    inline void FlaggedSystem::addFlaggedEntity_(Entity& e) {
        ASSERT(careAboutEntity(e));
        EntityIndex entity_id = e.getIndex();
        fast_vector<u32>& rel_ents = relevant_entities_[entity_id.getEntityTypeId()];
        rel_ents.push_back(entity_id.getEntityIndex());
    }

    inline void FlaggedSystem::update_(Entity& e, f32 dt) {
        PROFILE_MEASURE_FROM(pre_update_m_);
        preUpdate(dt);
        PROFILE_MEASURE_TO(pre_update_m_);

        PROFILE_MEASURE_FROM(update_m_);
        for (u_et_id_=0; u_et_id_<relevant_entities_.size(); ++u_et_id_) {
            EntityManager::EntityTypeCtx& etctx = manager_->entity_types_[u_et_id_];
            fast_vector<u32>& rel_ents = relevant_entities_[u_et_id_];
            // sort
            sort_before_upd_(u_et_id_, rel_ents);
            e.index_.setEntityTypeId(u_et_id_);

            for (u_pos_ = 0; u_pos_<rel_ents.size(); ++u_pos_) {
                etctx.comps_pool.getIndexForPos2(rel_ents[u_pos_], e.index_.accInnerIndex());
                updateEntity(e, dt);
                e.clearTrackedFlagsForSystem_(this);
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
        postUpdate(dt);
        PROFILE_MEASURE_TO(post_update_m_);
    }

    inline void FlaggedSystem::init_(EntityManager& mgr, u16 entity_types_count, u32 pipeline_id, u32 system_id, u32& flags_offset_io) {
        System::init_(mgr, entity_types_count, pipeline_id, system_id, flags_offset_io);

        needed_flags_ = NeededFlags();
        // add needed flags
        for (u32 fid=0; fid<FlagsMask::size(); ++fid) {
            if (needed_flags_[fid]) {
                if (!flag_positions_mask_[fid]) {
                    ASSERT_M(flags_offset_io < FlagsMaskLong::size(), "Not enough space in flags mask");
                    flag_positions_[fid] = flags_offset_io;
                    flag_positions_mask_ |= (1 << flags_offset_io);
                    flags_offset_io++;
                }
                needed_flags_positions_ |= (1 << flag_positions_[fid]);
            }
        }
    }
}