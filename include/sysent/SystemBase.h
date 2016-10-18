#ifndef SYSTEMBASE_H
#define SYSTEMBASE_H

#include "EntityIndex.h"
#include "types/containers/fast_vector.h"
#include "EntityTypeInfo.h"

namespace grynca {

    // fw
    class Entity;
    class EntityManager;

    class SystemBase {
    public:
        SystemBase();
        virtual ~SystemBase();

        EntityManager& getEntityManager();

        bool isEntityTypeCompatible(const EntityTypeInfo& eti);
        bool careAboutEntity(Entity& e);
        uint32_t addRelevantEntity(Entity& e);
        uint32_t removeRelevantEntity(Entity& e);

        virtual FlagsMask getTrackedFlags() = 0;
        virtual RolesMask getNeededRoles() = 0;

        virtual void preUpdate() {}
        virtual void postUpdate() {}

        virtual void updateEntity(Entity& e, float dt) {}
        virtual void afterAddedEntity(Entity& e) {}
        virtual void beforeRemovedEntity(Entity& e) {}

        // it is good idea to precompute mask for checking multiple flags in system
        FlagsMaskLong calcFlagsMask(std::initializer_list<uint32_t> il);
    private:
        friend class EntityManager;
        friend class Entity;

        template <typename SystemType>
        void init_(EntityManager& mgr, uint16_t entity_types_count, uint32_t& flags_offset_io);
        uint32_t findRelevantEntityPos_(fast_vector<uint32_t>& rel_ents, uint32_t entity_id);
        bool isAtPos_(fast_vector<uint32_t>& rel_ents, uint32_t pos, uint32_t id);
        uint32_t getFlagPosition_(uint32_t flag_id);

        EntityManager* manager_;
        RolesMask needed_roles_;
        fast_vector<fast_vector<uint32_t> > relevant_entities_;     // sorted indices of relevant entities (vector for each entity type)
        fast_vector<uint32_t> flag_positions_;
        FlagsMaskLong flag_positions_mask_;
    };

}

#include "SystemBase.inl"
#endif //SYSTEMBASE_H
