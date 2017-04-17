#include "SystemAll.h"
#include "EntityManager.h"
#include "RolesComposition.h"

namespace grynca {

    inline SystemBase::SystemBase()
     : enabled_(true), entities_(this)
    {
    }

    inline SystemBase::~SystemBase()
    {
        unsubscribeAllEvents_();
    }

    inline EntityManager& SystemBase::getEntityManager() {
        return entities_.getManager();
    }

    inline bool SystemBase::careAboutEntity(const Entity& e)const {
        return areRolesCompatible(e.getRoles());
    }

    inline bool SystemBase::areRolesCompatible(const RolesMask& rm)const {
        return (rm&needed_roles_) == needed_roles_;
    }

    inline u32 SystemBase::getEntitiesCount()const {
        return entities_.getCount();
    }

    template <typename EventType, typename HandlerType>
    inline void SystemBase::subscribeEvent(HandlerType *handler) {
        ASSERT_M(findSubscribedEvent_<EventType>() == InvalidId(), "Event already subscribed.");

        EntityManager& em = getEntityManager();
        event_handlers_.emplace_back();
        EventHandler& eh = event_handlers_.back();
        eh.event_id = em.getEventId_<EventType>();
        eh.cb.bind<EventRecieveHelper<EventType, HandlerType> >((HandlerType *) this);

        for (u32 i=0; i<compatible_compositions_.size(); ++i) {
            u32 comp_id = compatible_compositions_[i];
            if (enabled_) {
                EventCallbackId cb_id = em.roles_compositions_.accComposition(comp_id).system_events_.addCallback(eh.event_id, eh.cb);
                eh.subscribed.push_back(cb_id);
            }
            else {
                eh.subscribed.emplace_back();
            }
        }
    }

    template <typename HandlerType>
    inline void SystemBase::subscribeFlags(HandlerType *handler, FlagsMask flags_mask) {
        tracked_flags_ = flags_mask;

        struct Helper {
            static void f(HandlerType* h, Entity& e, u32 flag_id) {
                h->recieve(e, flag_id);
            }
        };

        flag_recieve_func_.bind<Helper>(handler);
    }

    template <typename EventType>
    inline void SystemBase::unsubscribeEvent() {
        u32 ev_pos = findSubscribedEvent_<EventType>();
        ASSERT_M(ev_pos != InvalidId(), "Event not subscribed.");

        EntityManager& em = getEntityManager();
        EventHandler& eh = event_handlers_[ev_pos];
        for (u32 i=0; i<compatible_compositions_.size(); ++i) {
            u32 comp_id = compatible_compositions_[i];
            em.roles_compositions_.accComposition(comp_id).system_events_.removeCallback(eh.subscribed[i]);
        }

        event_handlers_.erase(event_handlers_.begin()+ev_pos);
    }

    inline const RolesMask& SystemBase::getNeededRoles()const {
        return needed_roles_;
    }

    inline const FlagsMask& SystemBase::getTrackedFlags()const {
        return tracked_flags_;
    }

    inline SystemPos SystemBase::getSystemPos()const {
        return system_pos_;
    }

    inline void SystemBase::enable() {
        ASSERT(!isEnabled());
        enabled_ = true;
        subscribeAllEvents_();
    }

    inline void SystemBase::disable() {
        ASSERT(isEnabled());
        enabled_ = false;
        unsubscribeAllEvents_();
    }

    inline bool SystemBase::isCurrentlyLooping(u16 ent_type_id)const {
        return entities_.isCurrentlyLooping(ent_type_id);
    }

    inline bool SystemBase::isEnabled()const {
        return enabled_;
    }

    template <typename EventType>
    inline u32 SystemBase::findSubscribedEvent_() {
        u32 event_id = getEntityManager().getEventId_<EventType>();
        for (u32 i=0; i<event_handlers_.size(); ++i) {
            if (event_handlers_[i].event_id == event_id)
                return i;
        }
        return InvalidId();
    }

    inline void SystemBase::subscribeToComposition_(RolesComposition& comp) {
        compatible_compositions_.push_back(comp.getId());

        for (u32 i=0; i<event_handlers_.size(); ++i) {
            EventHandler& eh = event_handlers_[i];
            if (enabled_) {
                EventCallbackId cb_id = comp.system_events_.addCallback(eh.event_id, eh.cb);
                eh.subscribed.push_back(cb_id);
            }
            else {
                eh.subscribed.emplace_back();
            }
        }
    }

    inline u32 SystemBase::getFlagPosition_(u32 flag_id)const {
        ASSERT_M(flag_id <= FlagsMask::size() && flag_positions_[flag_id]!=InvalidId(),
                 "This flag is not tracked by this system");
        return flag_positions_[flag_id];
    }

    inline void SystemBase::update_(f32 dt) {
        PROFILE_SAMPLE(upd_prof_);
        update(dt, entities_);
        postUpdate_();
    }

    inline void SystemBase::init_(EntityManager& mgr, u16 entity_types_cnt, u32 pipeline_id, u32 system_id, u32& flags_offset_io) {
        entities_.init(mgr, entity_types_cnt);
        system_pos_ = SystemPos(pipeline_id, system_id);
        needed_roles_ = NeededRoles();

        for (u32 fid=0; fid<FlagsMask::size(); ++fid) {
            if (tracked_flags_[fid]) {
                ASSERT_M(flags_offset_io < FlagsMaskLong::size(), "Not enough space in flags mask");
                flag_positions_[fid] = flags_offset_io;
                flag_positions_mask_ |= (1 << flags_offset_io);
                flags_offset_io++;
            } else {
                flag_positions_[fid] = InvalidId();
            }
        }

        PROFILE_ID_INIT(upd_prof_, "system " + ssu::toStringA(system_pos_.system_id));
    }

    inline void SystemBase::unsubscribeAllEvents_() {
        EntityManager& em = getEntityManager();
        for (u32 i=0; i<event_handlers_.size(); ++i) {
            EventHandler& eh = event_handlers_[i];
            for (u32 j=0; j<eh.subscribed.size(); ++j) {
                u32 comp_id = compatible_compositions_[j];
                em.roles_compositions_.accComposition(comp_id).system_events_.removeCallback(eh.subscribed[j]);
                eh.subscribed[j].invalidate();
            }
        }
    }

    inline void SystemBase::subscribeAllEvents_() {
        EntityManager& em = getEntityManager();
        for (u32 i=0; i<event_handlers_.size(); ++i) {
            EventHandler& eh = event_handlers_[i];
            for (u32 j=0; j<eh.subscribed.size(); ++j) {
                ASSERT_M(!eh.subscribed[j].isValid(), "Already subscribed");
                u32 comp_id = compatible_compositions_[j];
                EventCallbackId cb_id = em.roles_compositions_.accComposition(comp_id).system_events_.addCallback(eh.event_id, eh.cb);
                eh.subscribed[j] = cb_id;
            }
        }
    }

    inline bool SystemScheduled::scheduleEntityUpdate(const Entity& e) {
        ASSERT(careAboutEntity(e));
        return entities_.addEntity(e.getIndex());
    }

    inline bool SystemScheduled::scheduleEntityUpdate(EntityIndex eid) {
        return entities_.addEntity(eid);
    }

    inline void SystemScheduled::postUpdate_() {
        entities_.clear();
    }
}