#ifndef SYSTEMS_H
#define SYSTEMS_H

#define SYSTEM_TYPES() MovementSystem

class MovementSystem : public grynca::System
{
public:
    void update(grynca::Entity& e, float dt) override {
        e.getBase<Movable>().move(dt);
    }

    virtual grynca::RolesMask getNeededRoles() {
        return {grynca::erMovable};
    }

};


#endif //SYSTEMS_H
