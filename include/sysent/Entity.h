#ifndef ENTITY_H
#define ENTITY_H

#include "types/Manager.h"
#include "types/Variant.h"
#include "RolesMask.h"

namespace grynca {
    template<typename EntityTypes> class EntityManager;


    template <typename EntityTypes>
    class Entity : public ManagedItemVersioned<EntityManager<EntityTypes> >,
                    public Variant<EntityTypes>
    {
    public:
        const RolesMask& getRoles() { return roles_; }
        void setRoles(const RolesMask& roles) { roles_ = roles; }
    private:
        RolesMask roles_;
    };
}

#endif //ENTITY_H
