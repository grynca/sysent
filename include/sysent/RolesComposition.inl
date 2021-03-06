#include "RolesComposition.h"
#include "System.h"
#include "sysent_config.h"

namespace grynca {

    inline void RolesComposition::addForSystem(SystemBase* sb) {
        if (!sb->areRolesCompatible(mask_))
            return;
        sb->subscribeToComposition_(*this);

        SystemPos spos = sb->getSystemPos();
        compatible_[spos.pipeline_id].set(spos.system_id);

        SystemAll* s = dynamic_cast<SystemAll*>(sb);
        if (s) {
            compatible_sa_[spos.pipeline_id].set(spos.system_id);
        }
        else {
            compatible_ss_[spos.pipeline_id].set(spos.system_id);
        }
    }

    inline const RolesMask& RolesComposition::getMask()const {
        return mask_;
    }

    inline u32 RolesComposition::getId()const {
        return id_;
    }

    template <typename EventType>
    inline void RolesComposition::emitEvent(EventType& event)const {
        system_events_.emitT(event);
    }

    inline u32 RolesCompositions::getOrCreateId(const RolesMask &mask, SystemsPipeline *pipelines) {
        bool was_added;
        u32* id_ptr = rm_to_id.findOrAddItem(mask, was_added);
        if (was_added) {
            *id_ptr = u32(compositions_.size());
            compositions_.emplace_back();
            RolesComposition& comp = compositions_.back();
            comp.mask_ = mask;
            comp.id_ = *id_ptr;
            for (u32 i=0; i<SYSENT_PIPELINES_CNT; ++i) {
                for (u32 j=0; j<pipelines[i].systems.size(); ++j) {
                    SystemBase* sb = pipelines[i].systems[j];
                    comp.addForSystem(sb);
                }
            }
        }
        return *id_ptr;
    }

    inline const RolesComposition& RolesCompositions::getComposition(u32 id)const {
        return compositions_[id];
    }

    inline RolesComposition& RolesCompositions::accComposition(u32 id) {
        return compositions_[id];
    }

    inline u32 RolesCompositions::getInfosCount()const {
        return u32(compositions_.size());
    }

}