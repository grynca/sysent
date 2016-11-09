#ifndef ENTITYMANAGER_H
#define ENTITYMANAGER_H

#include "EntityIndex.h"
#include "EntityTypeInfo.h"
#include "types/containers/MultiPool.h"

namespace grynca {

    class System;
    class Entity;

    typedef fast_vector<Entity> EntityVec;

    class EntityManager {
    public:
        typedef MultiPool<MAX_ENTITY_COMPS, EntityManager> EntitiesPool;

    public:
        EntityManager();
        virtual ~EntityManager() ;

        template <typename EntityTypes>
        void init(u32 initial_reserve, u32 system_pipelines_count);

        // must call ent.create() after initialization
        //  ( this will add Entity to systems & call creation callbacks)
        Entity newEntity(u16 entity_type_id);

        Entity getEntity(EntityIndex id);           // faster does not check for validity
        Entity tryGetEntity(EntityIndex id);        // checks for validity, check e.isValid()

        EntityTypeInfo& getEntityTypeInfo(u16 entity_type_id);
        EntitiesPool& getEntitiesPool(u16 entity_type_id);
        void resolveEntityFlag(Entity& e, u32 flag_id, u32 pipeline_id);

        // systems are looped in order in which they are added
        template <typename SystemType>
        SystemType& addSystem(u32 pipeline_id);

        System* getSystem(u32 pipeline_id, u32 system_id);
        u32 getSystemsPipelineSize(u32 pipeline_id);

        void updateSystemsPipeline(u32 pipeline_id, f32 dt);
#ifdef PROFILE_BUILD
        std::string getProfileString();
#endif
    private:
        friend class EntityTypesInitializer_;
        friend class Entity;
        friend class System;
        friend class SystemFlagged;

        struct SystemsPipeline {
            fast_vector<System*> systems_;
            fast_vector<u32> loop_all_;
            fast_vector<u32> loop_flagged_;

            // for each flag indices of flagged systems that need it
            fast_vector<fast_vector<u32> > needs_flag_;
            // for each role indices of systems that need it
            fast_vector<fast_vector<u32> > needs_role_;
        };

        class EntityTypeCtx {
        public:
            template <typename EntType>
            void init(u32 initial_reserve);

            EntityTypeInfo info_;
            MultiPool<MAX_ENTITY_COMPS, EntityManager> comps_pool;
        };

        struct EntityTypesInitializer_ {
            template <typename EntityTypes, typename T>
            static void f(EntityManager& mgr, u32 initial_reserve) {
                int pack_tid = EntityTypes::template pos<T>();
                mgr.entity_types_.push_back();
                mgr.entity_types_.back().init<T>(initial_reserve);

                u32 internal_tid = Type<T, EntityManager>::getInternalTypeId();
                if (internal_tid  >= mgr.type_ids_map_.size())
                    mgr.type_ids_map_.resize(internal_tid+1, InvalidId());
                mgr.type_ids_map_[internal_tid] = (u32)pack_tid;
            }
        };

        void beforeEntityRoleAdded_(Entity& ent, u32 role_id);
        void beforeEntityRoleRemoved_(Entity& ent, u32 role_id);
        void beforeEntityKilled_(Entity& ent);      // called by entity when killed
        void afterEntityCreated_(Entity& ent);

        fast_vector<SystemsPipeline> pipelines_;
        fast_vector<EntityTypeCtx> entity_types_;
        fast_vector<u32> type_ids_map_; // maps internal type ids to type ids in entity types pack
    };
}

#include "EntityManager.inl"
#endif //ENTITYMANAGER_H
