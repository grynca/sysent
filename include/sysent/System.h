#ifndef SYSTEMBASE_H
#define SYSTEMBASE_H

#include "EntityIndex.h"
#include "functions/debug.h"
#include "types/containers/fast_vector.h"
#include "EntityTypeInfo.h"

namespace grynca {

    // fw
    class Entity;
    class EntityManager;

    class System {
    public:
        enum Subtype {
            stLoopAll,
            stLoopFlagged
        };

        // sorted indices of relevant entities (vector for each entity type)
        typedef fast_vector<fast_vector<u32> > Entities;

    public:
        System(Subtype st = stLoopAll);
        virtual ~System();

        EntityManager& getEntityManager();

        bool careAboutEntity(Entity& e);
        void resolveEntityFlag(Entity& e, u32 flag_id)const;

        const RolesMask& getNeededRoles() { return needed_roles_; }
        u32 getPipelineId()const { return pipeline_id_; }
        Subtype getSubtype()const { return subtype_; }

#ifdef PROFILE_BUILD
        const Measure& getPreUpdateMeasure()const { return pre_update_m_; }
        const Measure& getUpdateMeasure()const { return update_m_; }
        const Measure& getPostUpdateMeasure()const { return post_update_m_; }
        std::string getProfileDebugString()const {
            return "pre_update: " + string_utils::toString(pre_update_m_.calcAvgDt())
                    + " sec, update: " + string_utils::toString(update_m_.calcAvgDt())
                    + " sec, post_update: " + string_utils::toString(post_update_m_.calcAvgDt()) + " sec.";
        }
#endif
    protected:
        virtual RolesMask NeededRoles() = 0;
        virtual void init() {}
        virtual void afterAddedEntity(Entity& e) {}
        virtual void beforeRemovedEntity(Entity& e) {}
        virtual void preUpdate() {}
        virtual void postUpdate() {}
        virtual void updateEntity(Entity& e, f32 dt) {}
    protected:
        friend class EntityManager;
        friend class Entity;

        bool isEntAtPos_(Entities& ents, Entity& ent, u32 pos);
        void addEntity_(Entity& e);
        void removeEntity_(Entity& e);
        virtual void update_(Entity& e, f32 dt);
        virtual void init_(EntityManager& mgr, u16 entity_types_count, u32 pipeline_id);


        void innerAdd_(Entity& e);
        void innerRemove_(Entity& e);

        EntityManager* manager_;
        Subtype subtype_;
        u32 pipeline_id_;
        RolesMask needed_roles_;
        Entities relevant_entities_;

        // update ctx
        u16 u_et_id_;
        u32 u_pos_;

        fast_vector<Entity> deferred_add_;
        fast_vector<Entity> deferred_remove_;

        DEF_MEASURE(pre_update_m_);
        DEF_MEASURE(update_m_);
        DEF_MEASURE(post_update_m_);
    };
}

#include "System.inl"
#endif //SYSTEMBASE_H