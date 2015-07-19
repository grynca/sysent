#ifndef ENTITY_H
#define ENTITY_H

#include "types/Manager.h"
#include "types/Variant.h"
#include "setup/entity_roles.h"
#include "setup/entity_types.h"

namespace grynca {
    class EntityManager;

    class Entity : public ManagedItemVersioned<EntityManager>,
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
