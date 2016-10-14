#ifndef ENTITYTYPEINFO_H
#define ENTITYTYPEINFO_H
#include "types/containers/fast_vector.h"
#include "types/Type.h"
#include "EntityIndex.h"
#include "Mask.h"
#include <stdint.h>

namespace grynca {

    // fw
    class Entity;
    class EntityManager;

    class EntityTypeInfo {
    public:
        typedef void (*CompsDefConstructor) (uint8_t* comps_data, const fast_vector<uint32_t>& comps_offsets);

        EntityTypeInfo();

        template <typename EntityType>
        static EntityTypeInfo create();
        template <typename CompType>
        bool containsComponent()const;
        template <typename CompType>
        uint32_t getComponentOffset()const;
        uint32_t getComponentsSize()const;

        const RolesMask& getComponentRoles()const;
        void callCompsDefConstructor(Entity& e)const;

        // returns internal type ids of contained components
        fast_vector<uint32_t> getContainedComponents()const;
    private:
        struct Creator_ {
            template <typename TP, typename T>
            static void f(EntityTypeInfo& ti);
        };
        struct CompDefConstructor_ {
            template <typename TP, typename T>
            static void f(uint8_t* comps_data, const fast_vector<uint32_t>& comps_offsets);
        };

        template <typename ComponentTypes>
        static void constructComps(uint8_t* comps_data, const fast_vector<uint32_t>& comps_offsets);

        // maps component type id to offset in entity
        //   -1 for non contained components
        fast_vector<uint32_t> component_offsets_;
        uint32_t components_size_;
        RolesMask components_roles_;        // maximal possible roles of entity
        CompsDefConstructor components_constructor_;
    };

}

#include "EntityTypeInfo.inl"
#endif //ENTITYTYPEINFO_H
