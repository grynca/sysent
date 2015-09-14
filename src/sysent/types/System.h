#ifndef SYSTEM_H
#define SYSTEM_H

#include "RolesMask.h"

namespace grynca {

    class Entity;

    class System {
    public:
        System() { }
        virtual ~System() { }

        virtual void preUpdate() {}
        virtual void update(grynca::Entity& e, float dt) = 0;
        virtual void postUpdate() {}
        virtual RolesMask getNeededRoles() = 0;


    private:
    };
}

#endif //SYSTEM_H
