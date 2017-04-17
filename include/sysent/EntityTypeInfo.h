#ifndef ENTITYTYPEINFO_H
#define ENTITYTYPEINFO_H
#include "types/containers/fast_vector.h"
#include "types/Type.h"
#include "EntityIndex.h"
#include "Masks.h"
#include <stdint.h>

namespace grynca {

    // fw
    class Entity;
    class EntityManager;

    class EntityTypeInfo {
    public:
        EntityTypeInfo();

        template <typename EntityType>
        void init();

        template <typename CompType>
        bool containsComponent()const;
        template <typename CompType>
        u32 getComponentPos()const;
        u32 getComponentsSize()const;

        const RolesMask& getInitialComponentRoles()const;

        // returns internal type ids of contained components
        fast_vector<u32> getContainedComponents()const;
        u32 getComponentsCount()const;
    private:
        struct Creator_ {
            template <typename TP, typename T>
            static void f(EntityTypeInfo& ti);
        };

        // maps component type id to component position in entity
        //   -1 for non contained components
        fast_vector<u32> component_positions_;
        u32 components_size_;
        u32 components_count_;
        RolesMask initial_component_roles_;
    };
}
#endif //ENTITYTYPEINFO_H

#if !defined(ENTITYTYPEINFO_INL) && !defined(WITHOUT_IMPL)
#define ENTITYTYPEINFO_INL
# include "EntityTypeInfo.inl"
#endif // ENTITYTYPEINFO_INL
