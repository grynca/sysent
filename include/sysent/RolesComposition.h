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


    template <> class Hasher<RolesMask> {
    public:
        u32 operator()(const RolesMask& key) const { return calcHash64((u64)key.getWords()[0]); }
    };

    class RolesCompositions {
    public:
        // if composition does not exist yet, it is created and compatible systems are found
        u32 getOrCreateId(const RolesMask &mask, SystemsPipeline *pipelines);

        const RolesComposition& getComposition(u32 id)const;
        RolesComposition& accComposition(u32 id);
        u32 getInfosCount()const;
    private:
        fast_vector<RolesComposition> compositions_;
        HashMap<u32, RolesMask, Hasher<RolesMask>> rm_to_id;
    };
}
#endif //ROLESCOMPOSITION_H

#if !defined(ROLESCOMPOSITION_INL) && !defined(WITHOUT_IMPL)
#define ROLESCOMPOSITION_INL
# include "RolesComposition.inl"
#endif // ROLESCOMPOSITION_INL
