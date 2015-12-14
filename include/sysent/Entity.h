#ifndef ENTITY_H
#define ENTITY_H

#include "types/Manager.h"
#include "types/Variant.h"
#include "RolesMask.h"

namespace grynca {
    template<typename EntityTypes> class EntityManager;

    class EntityBase {
    public:
        const RolesMask& getRoles() { return roles_; }
        void setRoles(const RolesMask& roles) { roles_ = roles; }
        bool hasRoles(const RolesMask& roles) { return (roles_&roles) == roles; }
        void addRoles(const RolesMask& roles) { roles_ = roles_ | roles; }

        bool isDying() { return dying_; }
        void kill() {
            dying_ = true;
            roles_ = {};
        }
    private:
        bool dying_;
        RolesMask roles_;
    };


    // All entity types must be derived from EntityBase!

    template <typename EntityTypes>
    class Entity : public ManagedItemVersioned<EntityManager<EntityTypes> >,
                   public Variant<EntityTypes>
    {
    public:
        void kill() {
            Variant<EntityTypes>::template getBase<EntityBase>().kill();
        }
    };
}

#endif //ENTITY_H
