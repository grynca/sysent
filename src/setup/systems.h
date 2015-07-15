#ifndef SYSTEMS_H
#define SYSTEMS_H

#include "../types/System.h"
#include "../types/Entity.h"

class MovementSystem : public grynca::System
{
public:
    NEEDS(speed, position) update(grynca::Entity& e, T& t, double dt) {
        t.position += t.speed*dt;
    }

    virtual grynca::RolesMask getNeededRoles() {
        return grynca::erMovable;
    }

};


#endif //SYSTEMS_H
