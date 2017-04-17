#ifndef SYSTEM_H
#define SYSTEM_H

#include "EntityIndex.h"
#include "SystemPos.h"
#include "EntitiesList.h"
#include "functions/debug.h"
#include "functions/profiling.h"

namespace grynca {

    // fw
    class Entity;
    class EntityManager;
    class EventsHandlerTyped;
    class RolesComposition;

    class SystemBase {
    public:
        SystemBase();
        virtual ~SystemBase();

        EntityManager& getEntityManager();

        bool careAboutEntity(const Entity& e)const;
        bool areRolesCompatible(const RolesMask& rm)const;

        u32 getEntitiesCount()const;        // number of entities currently in system

        // pointer to handler must remain valid
        // and have method:
        //      bool recieve(const EventType& et)
        template <typename EventType, typename HandlerType>
        void subscribeEvent(HandlerType *handler);

        // and have method:
        //      void recieve(const Entity& e, u32 flag_id)
        // overrides previously subscribed handler
        template <typename HandlerType>
        void subscribeFlags(HandlerType *handler, FlagsMask flags_mask);

        template <typename EventType>
        void unsubscribeEvent();

        const RolesMask& getNeededRoles()const;
        const FlagsMask& getTrackedFlags()const;
        SystemPos getSystemPos()const;
        bool isEnabled()const;
        void enable();
        void disable();

        bool isCurrentlyLooping(u16 ent_type_id)const;
    protected:
        virtual RolesMask NeededRoles() = 0;

        // when entity created/destroyed or when roles changed
        virtual void onEntityAdded(Entity &e, bool by_roles_change) {}
        virtual void onEntityRemoved(Entity &e, bool by_roles_change) {}
        virtual void update(f32 dt, EntitiesList& entities) {}

    protected:
        friend class EntityManager;
        friend class Entity;
        friend class RolesComposition;

        struct EventHandler {
            u32 event_id;
            EventsHandlerTyped::CbFunc cb;

            fast_vector<EventCallbackId> subscribed;
        };

        template <typename EventType>
        u32 findSubscribedEvent_();
        void subscribeToComposition_(RolesComposition& comp);
        u32 getFlagPosition_(u32 flag_id)const;
        void update_(f32 dt);
        void init_(EntityManager& mgr, u16 entity_types_cnt, u32 pipeline_id, u32 system_id, u32& flags_offset_io);
        void unsubscribeAllEvents_();
        void subscribeAllEvents_();
        virtual void postUpdate_() = 0;

        PROFILE_ID_DEF(upd_prof_);

        bool enabled_;
        EntitiesList entities_;
        SystemPos system_pos_;
        RolesMask needed_roles_;

        fast_vector<u32> compatible_compositions_;
        fast_vector<EventHandler> event_handlers_;

        // flags
        ObjFunc<void(Entity&, u32)> flag_recieve_func_;
        FlagsMask tracked_flags_;
        // positions of tracked flags in long flag-mask
        u32 flag_positions_[FlagsMask::size()];
        FlagsMaskLong flag_positions_mask_;
    };

    class SystemAll : public SystemBase {
    public:
    private:
        virtual void postUpdate_() override {}
    };

    class SystemScheduled : public SystemBase {
    public:
        bool scheduleEntityUpdate(const Entity& e);
        bool scheduleEntityUpdate(EntityIndex eid);
    private:
        virtual void postUpdate_() override;
    };
}

#include "System.inl"
#endif //SYSTEM_H
