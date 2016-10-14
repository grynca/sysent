#ifndef ENTITIES_H
#define ENTITIES_H

#include "base.h"

using namespace grynca;

DEFINE_ENUM(EntityRoles,
            erMovable,
            erTeleportable
);

DEFINE_ENUM(EntityFlags,
            efMoved,
            efTeleported
);

class CMovable {
public:
    static RolesMask componentRoles() {
        return {EntityRoles::erMovable, EntityRoles::erTeleportable};
    }

    float position;
    float speed;
};

class Orc : public EntityDef<CMovable> {
public:

};

class Rock : public EntityDef<CMovable> {
public:

};

class TeleportSystem : public SystemBase {
public:
    virtual RolesMask getNeededRoles() override {
        return {EntityRoles::erTeleportable};
    }

    virtual FlagsMask getTrackedFlags() override {
        return {EntityFlags::efMoved, EntityFlags::efTeleported};
    }

    virtual void updateEntity(Entity& e, float dt) override {
        if (!e.getFlag(this, EntityFlags::efMoved)) {
            if (rand()%2)
                teleportEntity(e);
        }
    }

    static void teleportEntity(Entity& e) {
        //std::cout << "  " << e.getIndex() << " teleported" << std::endl;
        e.setFlag(EntityFlags::efTeleported);
        e.getComponent<CMovable>().position = rand();
    }
};


class MovementSystem : public SystemBase
{
public:
    MovementSystem() : added(0), removed(0) {}

    virtual RolesMask getNeededRoles() override {
        return {EntityRoles::erMovable};
    }

    virtual FlagsMask getTrackedFlags() override {
        return {EntityFlags::efMoved, EntityFlags::efTeleported};
    }

    virtual void updateEntity(Entity& e, float dt) override {
        if (!e.getFlag(this, EntityFlags::efTeleported)) {
            moveEntity(e, dt);
        }
    }

    virtual void preUpdate() override {
        if (added) {
            std::cout << " Movement system: added relevant entities: " << added << std::endl;
        }
        if (removed) {
            std::cout << " Movement system: removed relevant entities: " << removed << std::endl;
        }
    }

    virtual void afterAddedEntity(Entity& e) override {
        ++added;
    }

    virtual void beforeRemovedEntity(Entity& e) override {
        ++removed;
    }

    virtual void postUpdate() override {
        added = removed = 0;
    }


    static void setEntityPosition(Entity& e, float pos) {
        e.setFlag(EntityFlags::efMoved);
        e.getComponent<CMovable>().position = pos;
    }

    static void moveEntity(Entity& e, float dt) {
        //std::cout << "  " << e.getIndex() << " moved" << std::endl;
        e.setFlag(EntityFlags::efMoved);
        e.getComponent<CMovable>().position += e.getComponent<CMovable>().speed * dt;
    }

    uint32_t added, removed;
};


typedef grynca::TypesPack<Orc, Rock> EntityTypes;

#endif //ENTITIES_H
