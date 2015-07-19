#ifndef SYSTEM_H
#define SYSTEM_H

#include "types/Manager.h"
#include "functions/meta.h"
#include "setup/entity_props.h"
#include "setup/entity_roles.h"

#define NEEDS_INNER(PROP) grynca::props::has_##PROP<T&>{}

#define ENTITY_FUNC(MNAME, ...) \
template <typename T> \
typename std::enable_if< !(AND_ALL(NEEDS_INNER, __VA_ARGS__)) >::type MNAME(grynca::Entity&, ...){} \
template <typename T> \
typename std::enable_if< AND_ALL(NEEDS_INNER, __VA_ARGS__) >::type MNAME

namespace grynca {

    class System {
    public:
        System() : system_id_(-1) { }

        virtual ~System() { }

        int32_t getSystemId() { return system_id_; }

        virtual RolesMask getNeededRoles() = 0;

    private:
        friend class SystemManager;

        int32_t system_id_;
    };
}

#endif //SYSTEM_H
