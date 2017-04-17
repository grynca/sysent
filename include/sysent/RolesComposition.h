#ifndef ROLESCOMPOSITION_H
#define ROLESCOMPOSITION_H

#include "Masks.h"
#include "types/EventsHandler.h"
#include "sysent_config.h"

namespace grynca {

    // fw
    class SystemBase;
    class SystemAll;
    class SystemScheduled;
    class SystemsPipeline;

    class RolesComposition {
    public:
        void addForSystem(SystemBase* sb);

        const RolesMask& getMask()const;
        u32 getId()const;

        template <typename EventType>
        void emitEvent(EventType& event)const;
    private:
        friend class EntityManager;
        friend class RolesCompositions;
        friend class SystemBase;

        u32 id_;
        RolesMask mask_;
        SystemsMask compatible_[SYSENT_PIPELINES_CNT];
        SystemsMask compatible_sa_[SYSENT_PIPELINES_CNT];
        SystemsMask compatible_ss_[SYSENT_PIPELINES_CNT];
        EventsHandlerTyped system_events_;
    };


    class RolesCompositions {
    public:
        u32 getId(const RolesMask& mask, SystemsPipeline* pipelines);

        const RolesComposition& getComposition(u32 id)const;
        RolesComposition& accComposition(u32 id);
        u32 getInfosCount()const;
    private:
        fast_vector<RolesComposition> compositions_;
    };
}
#endif //ROLESCOMPOSITION_H

#if !defined(ROLESCOMPOSITION_INL) && !defined(WITHOUT_IMPL)
#define ROLESCOMPOSITION_INL
# include "RolesComposition.inl"
#endif // ROLESCOMPOSITION_INL
