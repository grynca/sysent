#ifndef ENTITYMANAGER_H
#define ENTITYMANAGER_H

#include "EntityIndex.h"
#include "EntityTypeInfo.h"
#include "types/containers/Pool.h"

namespace grynca {

    class SystemBase;
    class Entity;

    typedef fast_vector<Entity> EntityVec;

    class EntityManager {
    public:
        static constexpr uint32_t MAX_SYSTEM_PACKS = 64;

        EntityManager();
        virtual ~EntityManager() ;

        template <typename EntityTypes>
        void init(uint32_t initial_reserve, uint32_t system_packs_count);

        Entity createEntity(uint16_t entity_type_id);       // caller must add to systems afterwards
        void addToSystems(Entity& ent);

        Entity getEntity(EntityIndex id);           // faster does not check for validity
        Entity tryGetEntity(EntityIndex id);        // checks for validity, check e.isValid()

        EntityTypeInfo& getEntityTypeInfo(uint16_t entity_type_id);

        template <typename SystemType>
        SystemType& addSystem(uint32_t systems_pack_id);

        SystemBase* getSystem(uint32_t systems_pack_id, uint32_t system_id);
        uint32_t getSystemsPackSize(uint32_t systems_pack_id);

        void updateSystemsPack(uint32_t systems_pack_id, float dt);
    private:
        friend class EntityTypesInitializer_;
        friend class Entity;
        friend class SystemBase;

        typedef fast_vector<SystemBase*> SystemsPack;

        struct EntityTypeCtx {
            EntityTypeCtx(const EntityTypeInfo& ti, uint32_t initial_reserve)
             : ent_type_info_(ti), components_data_(ti.getComponentsSize())
            {
                components_data_.reserve(initial_reserve);
            }

            EntityTypeInfo ent_type_info_;
            Pool components_data_;
        };

        struct EntityTypesInitializer_ {
            template <typename EntityTypes, typename T>
            static void f(EntityManager& mgr, uint32_t initial_reserve) {
                int pack_tid = EntityTypes::template pos<T>();
                mgr.entity_types_.emplace_back(EntityTypeInfo::create<T>(), initial_reserve);
                uint32_t internal_tid = Type<T, EntityManager>::getInternalTypeId();
                if (internal_tid  >= mgr.type_ids_map_.size())
                    mgr.type_ids_map_.resize(internal_tid+1);
                mgr.type_ids_map_[internal_tid] = (uint32_t)pack_tid;
            }
        };

        struct UpdateCtx {
            UpdateCtx()
             : system(NULL), entity_type_id(uint16_t(-1)), entity_pos(uint32_t(-1)) {}

            SystemBase* system;
            uint16_t entity_type_id;
            uint32_t entity_pos;
            fast_vector<uint32_t> defered_created_entity_positions_;
        };


        void addEntityToSystemInternal_(Entity& ent, SystemBase* system);
        void removeEntityFromSystems_(Entity& ent);      // called by entity
        void removeEntityFromSystemInternal_(Entity& ent, SystemBase* system);
        void beforeEntityRolesChanged_(Entity& ent, const RolesMask& new_roles);

        fast_vector<SystemsPack> systems_packs_;
        fast_vector<EntityTypeCtx> entity_types_;
        fast_vector<uint32_t> type_ids_map_; // maps internal type ids to type ids in entity types pack

        UpdateCtx update_ctx_;

        fast_vector<FlagsMaskLong> flag_bits_;  // for each flag mask specifying which bits are tied to the flag
        uint32_t flags_count_;
    };
}

#include "EntityManager.inl"
#endif //ENTITYMANAGER_H
