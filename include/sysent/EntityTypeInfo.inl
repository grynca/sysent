#include "EntityTypeInfo.h"
#include "Entity.h"

namespace grynca {

    inline EntityTypeInfo::EntityTypeInfo()
     : components_size_(0), components_count_(0)
    {}

    template <typename EntityType>
    inline void EntityTypeInfo::init() {
        type_info_ = Type<EntityType>::getInternalTypeInfo();
        EntityType::ComponentDataTypes::template callOnTypes<InitCompsInfo>(*this);
        initial_component_roles_ = Entity::getStaticComponentRoles<typename EntityType::ComponentDataTypes>();
    }

    template <typename CompType>
    inline bool EntityTypeInfo::containsComponent()const {
        u32 tid = Type<CompType, EntityTypeInfo>::getInternalTypeId();
        if (tid >= component_positions_.size())
            return false;
        return component_positions_[tid] != u32(-1);
    }

    template <typename CompType>
    inline u32 EntityTypeInfo::getComponentPos()const {
        ASSERT(containsComponent<CompType>());
        return component_positions_[Type<CompType, EntityTypeInfo>::getInternalTypeId()];
    }

    inline u32 EntityTypeInfo::getComponentsSize()const {
        return components_size_;
    }

    inline const RolesMask& EntityTypeInfo::getInitialComponentRoles()const {
        return initial_component_roles_;
    }

    inline fast_vector<u32> EntityTypeInfo::getContainedComponents()const {
        fast_vector<u32> v;
        for (u32 i=0; i<component_positions_.size(); ++i) {
            if (component_positions_[i] != InvalidId())
                v.push_back(i);
        }
        return v;
    }

    inline u32 EntityTypeInfo::getComponentsCount()const {
        return components_count_;
    }

    inline const TypeInfo& EntityTypeInfo::getTypeInfo()const {
        return type_info_;
    }

    template <typename TP, typename T>
    inline void EntityTypeInfo::InitCompsInfo::f(EntityTypeInfo& ti) {
    // static
        u32 tid = Type<T, EntityTypeInfo>::getInternalTypeId();
        if (tid >= ti.component_positions_.size())
            ti.component_positions_.resize(tid+1, u32(-1));
        ti.component_positions_[tid] = ti.components_count_;
        ++ti.components_count_;
        ti.components_size_+= u32(Type<T>::getSize());
    }
}
