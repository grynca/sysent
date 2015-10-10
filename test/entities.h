#ifndef ENTITIES_H
#define ENTITIES_H

#include "base.h"

using namespace grynca;

class Orc;
class Rock;
class MovementSystem;

typedef grynca::TypesPack<Orc, Rock> EntityTypes;
typedef grynca::TypesPack<MovementSystem> SystemTypes;

DEFINE_ENUM(EntityRoles,
            erCollidable,
            erMovable
);

class Movable {
public:
    //friend class MovementSystem;

    virtual void move(float dt) = 0;
};

class Orc : public Movable {
public:
    float position;
    float speed;
private:
    virtual void move(float dt) override {
        position += speed*dt;
    }
};

class Rock {
public:
    float position;
};


class MovementSystem
{
public:
    void init() {
        std::cout << "Movement System init." << std::endl;
    }
    void preUpdate() {}
    void postUpdate() {}

    void update(Entity<EntityTypes>& e, float dt) {
        e.getBase<Movable>().move(dt);
    }

    RolesMask getNeededRoles() { return {EntityRoles::erMovable}; }

};

#endif //ENTITIES_H
