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
        DISALLOW_COPY_AND_ASSIGN(EntityManager);
    public:
        EntityManager();
        virtual ~EntityManager();

        template <typename EntityTypes>
        void addEntityTypes(u32 initial_reserve);

        Entity newEntity(u16 entity_type_id);
        Entity getEntity(EntityIndex id)const;           // faster does not check for validity
        bool tryGetEntity(EntityIndex id, Entity& e_out)const;   // checks for validity

        template <typename LoopFunc>
        void loopEntities(u16 entities_type_id, const LoopFunc& lf);

        // wraps entity in EntityAcc
        template <typename EntityAcc>
        EntityAcc newEntity(u16 entity_type_id);
        template <typename EntityAcc>
        EntityAcc getEntity(EntityIndex id)const;
        template <typename EntityAcc>
        bool tryGetEntity(EntityIndex id, EntityAcc& eac_out)const;


        u32 getEntitiesCount()const;

        EntityTypeInfo& getEntityTypeInfo(u16 entity_type_id);
        u16 getEntityTypesCount()const;
        EntitiesPool& getEntitiesPool(u16 entity_type_id);

        // system must have default constructor
        // systems are looped in order in which they are added
        template <typename SystemType>
        SystemType& addSystem(u32 pipeline_id);
        // NULL when system type is not found
        template <typename SystemType>
        SystemType* getSystemByType(u32 pipeline_id);

        SystemBase* getSystem(SystemPos system_pos);
        u32 getSystemsPipelineSize(u32 pipeline_id);

        void updateSystemsPipeline(u32 pipeline_id, f32 dt);
        std::string getTypesDebugString()const;

        // gets called just before entity data is destroyed
        ObjFunc<void(Entity& ent)>& accBeforeEntityKilled();

        // if you need more control for destruction order
        void destroy();

        // get pointers to component buffers for faster access
        template <typename ComponentTypes>
        void getComponentsBufs(u16 entity_type_id, ChunkedBuffer** comp_bufs);
    private:
        friend class EntityTypesInitializer_;
        friend class Entity;
        friend class SystemBase;
        template <typename...> friend class EntityAccessor;

        struct EntityTypesInitializer_ {
            template <typename EntityTypes, typename T>
            static void f(EntityManager& mgr, u32 initial_reserve);
        };

        struct GetCompBufs_ {
            template <typename CompTypes, typename T>
            static void f(EntityManager& emgr, u16 entity_type_id, ChunkedBuffer** comp_bufs);
        };

        template <typename EventType>
        u32 getEventId_()const;
        void setSubscribedFlagsPositions_(SystemBase* sb);

        void afterEntityRoleAdded_(Entity& ent, u32 role_id);
        void beforeEntityRoleRemoved_(Entity& ent, u32 role_id);
        void beforeEntityKilled_(Entity& ent);      // called by entity when killed
        void afterEntityCreated_(Entity& ent);


        u32 entities_cnt_;
        u16 entity_types_cnt_;
        RolesCompositions roles_compositions_;
        SystemsPipeline pipelines_[SYSENT_PIPELINES_CNT];
        EntityTypeCtx entity_types_[SYSENT_MAX_ENTITY_TYPES];

        SystemsMask systems_for_role_[SYSENT_PIPELINES_CNT][RolesMask::size()];     // systems that need role

        // todo: maybe different flags for each pipeline ?
        FlagsMaskLong tracked_flag_bits_[FlagsMask::size()];  // for each flag - mask specifying which bits it occupies in FlagsMaskLong
        uint32_t flags_count_;
        SystemBase* flag_bit_to_system_[FlagsMaskLong::size()];     // for each long flag bit system that should be notified when bit is set

        // deferred add/remove of entities (called before system update)
        fast_vector<Entity> to_create_;
        fast_vector<Entity> to_remove_;

        ObjFunc<void(Entity& ent)> before_entity_killed_;
    };
}

#include "EntityManager.inl"
#endif //ENTITYMANAGER_H
