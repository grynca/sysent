#ifndef ENTITYTYPECTX_H
#define ENTITYTYPECTX_H

#include "EntityTypeInfo.h"
#include "types/containers/MultiPool.h"

namespace grynca {

    // fw
    class RolesCompositions;
    class SystemsPipeline;

    typedef MultiPool<SYSENT_MAX_ENTITY_COMPS, EntityManager> EntitiesPool;

    class EntityTypeCtx {
    public:
        template <typename EntType>
        void init(u32 initial_reserve, RolesCompositions& compos, SystemsPipeline* pipelines);

        EntityTypeInfo info;
        EntitiesPool pool;
        u32 roles_composition_id;
    };

}

#include "RolesComposition.h"
#include "SystemPipeline.h"

namespace grynca {

    template <typename EntType>
    inline void EntityTypeCtx::init(u32 initial_reserve, RolesCompositions& compos, SystemsPipeline* pipelines) {
        info.init<EntType>();
        pool.initComponents<typename EntType::ComponentTypes>();
        pool.reserve(initial_reserve);
        roles_composition_id = compos.getId(info.getInitialComponentRoles(), pipelines);
    }

}

#endif //ENTITYTYPECTX_H
