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

#define MAX_ROLES EntityRoles::end
#define MAX_FLAGS EntityFlags::end

#include "sysent.h"

class CMovable {
public:
    static RolesMask componentRoles() {
        return EntityRoles::erMovableMask() | EntityRoles::erTeleportableMask();
    }

    f32 position;
    f32 speed;
};

class Orc : public EntityDef<CMovable> {
public:

};

class Rock : public EntityDef<CMovable> {
public:

};

class TeleportSystem : public System {
public:

    TeleportSystem() : teleported_(0) {}

    virtual FlagsMask TrackedFlags() override {
        return EntityFlags::efMovedMask();
    }

    virtual RolesMask NeededRoles() override {
        return EntityRoles::erTeleportableMask();
    }

    virtual void preUpdate(f32 dt) override {
        teleported_ = 0;
    }

    virtual void updateEntity(Entity& e, f32 dt) override {
        if (!e.getFlag(this, EntityFlags::efMovedId)) {
            if (rand()%2) {
                teleportEntity(e);
            }
        }
    }

    void teleportEntity(Entity& e) {
        e.setFlag(EntityFlags::efTeleportedId);
        CMovable& cm = e.getComponent<CMovable>();
        cm.position = rand()%10000;
        ++teleported_;
    }

    u32 teleported_;
};


class MovementSystem : public System
{
public:
    MovementSystem() : moved_(0) {}

    virtual FlagsMask TrackedFlags() override {
        return EntityFlags::efTeleportedMask();
    }

    virtual RolesMask NeededRoles() override {
        return EntityRoles::erMovableMask();
    }

    virtual void preUpdate(f32 dt) override {
        moved_ = 0;
    }

    virtual void updateEntity(Entity& e, f32 dt) override {
        if (!e.getFlag(this, EntityFlags::efTeleportedId)) {
            moveEntity(e, dt);
        }
    }

    void moveEntity(Entity& e, f32 dt) {
        e.setFlag(EntityFlags::efMovedId);
        CMovable& cm =e.getComponent<CMovable>();
        cm.position += cm.speed * dt;
        ++moved_;
    }

    u32 moved_;
};

class CheckBoundsSystem : public FlaggedSystem
{
public:
    CheckBoundsSystem() : fixed_pos_(0) {
    }

    virtual RolesMask NeededRoles() override {
        return EntityRoles::erMovableMask();
    }

    virtual FlagsMask NeededFlags() override {
        return EntityFlags::efMovedMask() | EntityFlags::efTeleportedMask();
    }

    virtual void preUpdate(f32 dt) override {
        fixed_pos_ = 0;
    }

    virtual void updateEntity(Entity& e, f32 dt) override {
        CMovable& cm = e.getComponent<CMovable>();
        if (cm.position < 2000) {
            cm.position = 2000;
            e.setFlag(EntityFlags::efMovedId);
            ++fixed_pos_;
        }
        else if (cm.position > 8000) {
            cm.position = 8000;
            e.setFlag(EntityFlags::efMovedId);
            ++fixed_pos_;
        }

    }

    u32 fixed_pos_;
};



typedef grynca::TypesPack<Orc, Rock> EntityTypes;

#endif //ENTITIES_H
