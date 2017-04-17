#ifndef ENTITYMANAGER_H
#define ENTITYMANAGER_H

#include "EntityIndex.h"
#include "SystemPos.h"
#include "SystemPipeline.h"
#define WITHOUT_IMPL
#   include "EntityTypeCtx.h"
#   include "RolesComposition.h"
#undef WITHOUT_IMPL

namespace grynca {

    // fw
    class SystemBase;
    class Entity;

    typedef fast_vector<Entity> EntityVec;

    class EntityManager {
    public:
        EntityManager();
        virtual ~EntityManager() ;

        template <typename EntityTypes>
        void addEntityTypes(u32 initial_reserve);
        u32 getTypesCount()const;

        Entity newEntity(u16 entity_type_id);

        Entity getEntity(EntityIndex id);           // faster does not check for validity
        Entity tryGetEntity(EntityIndex id);        // checks for validity, check e.isValid()

        EntityTypeInfo& getEntityTypeInfo(u16 entity_type_id);
        u32 getEntityTypesCount()const;
        EntitiesPool& getEntitiesPool(u16 entity_type_id);

        // systems are looped in order in which they are added
        template <typename SystemType, typename... ConstrArgs>
        SystemType& addSystem(u32 pipeline_id, ConstrArgs&&... args);
        // NULL when system type is not found
        template <typename SystemType>
        SystemType* getSystemByType(u32 pipeline_id);

        SystemBase* getSystem(SystemPos system_pos);
        u32 getSystemsPipelineSize(u32 pipeline_id);

        void updateSystemsPipeline(u32 pipeline_id, f32 dt);
        ustring getTypesDebugString()const;
    private:
        friend class EntityTypesInitializer_;
        friend class Entity;
        friend class SystemBase;

        struct EntityTypesInitializer_ {
            template <typename EntityTypes, typename T>
            static void f(EntityManager& mgr, u32 initial_reserve);
        };

        template <typename EventType>
        u32 getEventId_()const;

        void afterEntityRoleAdded_(Entity& ent, u32 role_id);
        void beforeEntityRoleRemoved_(Entity& ent, u32 role_id);
        void beforeEntityKilled_(Entity& ent);      // called by entity when killed
        void afterEntityCreated_(Entity& ent);


        RolesCompositions roles_compositions_;
        SystemsPipeline pipelines_[SYSENT_PIPELINES_CNT];
        fast_vector<EntityTypeCtx> entity_types_;
        fast_vector<u32> type_ids_map_; // maps internal type ids to type ids in entity types pack

        SystemsMask systems_for_role_[SYSENT_PIPELINES_CNT][RolesMask::size()];     // systems that need role

        // todo: maybe different flags for each pipeline ?
        FlagsMaskLong tracked_flag_bits_[FlagsMask::size()];  // for each flag - mask specifying which bits it occupies in FlagsMaskLong
        uint32_t flags_count_;
        SystemBase* flag_bit_to_system_[FlagsMaskLong::size()];     // for each long flag bit system that should be notified when bit is set

        // deferred add/remove of entities (called before system update)
        fast_vector<Entity> to_create_;
        fast_vector<Entity> to_remove_;
    };
}

#include "EntityManager.inl"
#endif //ENTITYMANAGER_H
