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

#define ROLES_CNT EntityFlags::end
#define FLAGS_CNT EntityRoles::end

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

    virtual RolesMask NeededRoles() override {
        return EntityRoles::erTeleportableMask();
    }

    virtual void preUpdate() override {
        teleported_ = 0;
    }

    virtual void updateEntity(Entity& e, f32 dt) override {
        if (!e.getFlags()[EntityFlags::efMovedId]) {
            if (rand()%2) {
                teleportEntity(e);
            }
        }
        resolveEntityFlag(e, EntityFlags::efTeleportedId);
    }

    void teleportEntity(Entity& e) {
        e.setFlags(EntityFlags::efTeleportedMask());
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

    virtual RolesMask NeededRoles() override {
        return EntityRoles::erMovableMask();
    }

    virtual void preUpdate() override {
        moved_ = 0;
    }

    virtual void updateEntity(Entity& e, f32 dt) override {
        if (!e.getFlags()[EntityFlags::efTeleportedId]) {
            moveEntity(e, dt);
        }
        resolveEntityFlag(e, EntityFlags::efMovedId);
    }

    void moveEntity(Entity& e, f32 dt) {
        e.setFlags(EntityFlags::efMovedMask());
        CMovable& cm =e.getComponent<CMovable>();
        cm.position += cm.speed * dt;
        ++moved_;
    }

    u32 moved_;
};

class CheckBoundsSystem : public SystemFlagged
{
public:
    CheckBoundsSystem() : fixed_pos_(0) {}

    virtual RolesMask NeededRoles() override {
        return EntityRoles::erMovableMask();
    }

    virtual FlagsMask NeededFlagsAny() override {
        return EntityFlags::efMovedMask() | EntityFlags::efTeleportedMask();
    }

    virtual void preUpdate() override {
        fixed_pos_ = 0;
    }

    virtual void updateEntity(Entity& e, f32 dt) override {
        CMovable& cm = e.getComponent<CMovable>();
        if (cm.position < 2000) {
            cm.position = 2000;
            e.setFlag(EntityFlags::efMovedId);      // can set with id
            ++fixed_pos_;
        }
        else if (cm.position > 8000) {
            cm.position = 8000;
            e.setFlags(EntityFlags::efMovedMask());     // or with mask
            ++fixed_pos_;
        }

    }

    u32 fixed_pos_;
};



typedef grynca::TypesPack<Orc, Rock> EntityTypes;

#endif //ENTITIES_H
