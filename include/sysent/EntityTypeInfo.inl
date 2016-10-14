#include "EntityTypeInfo.h"
#include "Entity.h"

namespace grynca {

    inline EntityTypeInfo::EntityTypeInfo()
     : components_size_(0)
    {}

    template <typename EntityType>
    inline EntityTypeInfo EntityTypeInfo::create() {
    // static
        EntityTypeInfo ti;
        EntityType::ComponentTypes::template callOnTypes<Creator_>(ti);
        ti.components_roles_ = Entity::getComponentsRoles_<typename EntityType::ComponentTypes>();
        ti.components_constructor_ = constructComps<typename EntityType::ComponentTypes>;
        // todo: register destructor func for components ?
        return ti;
    }

    template <typename CompType>
    inline bool EntityTypeInfo::containsComponent()const {
        uint32_t tid = Type<CompType, EntityTypeInfo>::getInternalTypeId();
        if (tid >= component_offsets_.size())
            return false;
        return component_offsets_[tid] != uint32_t(-1);
    }

    template <typename CompType>
    inline uint32_t EntityTypeInfo::getComponentOffset()const {
        ASSERT(containsComponent<CompType>());
        return component_offsets_[Type<CompType, EntityTypeInfo>::getInternalTypeId()];
    }

    inline uint32_t EntityTypeInfo::getComponentsSize()const {
        return components_size_;
    }

    inline const RolesMask& EntityTypeInfo::getComponentRoles()const {
        return components_roles_;
    }

    inline void EntityTypeInfo::callCompsDefConstructor(Entity& e)const {
        components_constructor_(e.getData(), component_offsets_);
    }

    inline fast_vector<uint32_t> EntityTypeInfo::getContainedComponents()const {
        fast_vector<uint32_t> v;
        for (uint32_t i=0; i<component_offsets_.size(); ++i) {
            if (component_offsets_[i] != InvalidId())
                v.push_back(i);
        }
        return v;
    }

    template <typename TP, typename T>
    inline void EntityTypeInfo::Creator_::f(EntityTypeInfo& ti) {
    // static
        uint32_t tid = Type<T, EntityTypeInfo>::getInternalTypeId();
        if (tid >= ti.component_offsets_.size())
            ti.component_offsets_.resize(tid+1, uint32_t(-1));
        ti.component_offsets_[tid] = ti.components_size_;
        ti.components_size_+= Type<T>::getSize();
    }

    template <typename TP, typename T>
    inline void EntityTypeInfo::CompDefConstructor_::f(uint8_t* comps_data, const fast_vector<uint32_t>& comps_offsets) {
        // static
        uint32_t offset = comps_offsets[Type<T, EntityTypeInfo>::getInternalTypeId()];
        new (comps_data+offset) T();
    }

    template <typename ComponentTypes>
    inline void EntityTypeInfo::constructComps(uint8_t* comps_data, const fast_vector<uint32_t>& comps_offsets) {
    // static
        ComponentTypes::template callOnTypes<CompDefConstructor_>(comps_data, comps_offsets);
    }
}
