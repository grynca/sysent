#include "SystemBase.h"
#include "EntityManager.h"

namespace grynca {

    inline SystemBase::SystemBase()
     : manager_(NULL)
    {
    }

    inline SystemBase::~SystemBase() {
    }

    inline EntityManager& SystemBase::getEntityManager() {
        return *manager_;
    }

//    inline const RolesMask& SystemBase::getNeededRoles()const {
//        return needed_roles_;
//    }

    inline bool SystemBase::isEntityTypeCompatible(const EntityTypeInfo& eti) {
        return (eti.getComponentRoles()&needed_roles_) == needed_roles_;
    }

    inline bool SystemBase::careAboutEntity(Entity& e) {
        return (e.getRoles()&needed_roles_) == needed_roles_;
    }

    inline uint32_t SystemBase::addRelevantEntity(Entity& e) {
        EntityIndex entity_id = e.getIndex();
        fast_vector<uint32_t>& rel_ents = relevant_entities_[entity_id.getEntityTypeId()];
        uint32_t pos = findRelevantEntityPos_(rel_ents, entity_id.getEntityIndex());
        ASSERT_M(!isAtPos_(rel_ents, pos, entity_id.getEntityIndex()), "Already contained in system.");
        rel_ents.insert(rel_ents.begin() + pos, entity_id.getEntityIndex());
        afterAddedEntity(e);
        return pos;
    }

    inline uint32_t SystemBase::removeRelevantEntity(Entity& e) {
        beforeRemovedEntity(e);
        EntityIndex entity_id = e.getIndex();
        fast_vector<uint32_t>& rel_ents = relevant_entities_[entity_id.getEntityTypeId()];
        uint32_t pos = findRelevantEntityPos_(rel_ents, entity_id.getEntityIndex());
        ASSERT_M(isAtPos_(rel_ents, pos, entity_id.getEntityIndex()), "Not contained in system.");
        rel_ents.erase(rel_ents.begin() + pos);
        return pos;
    }

    inline bool SystemBase::isAtPos_(fast_vector<uint32_t>& rel_ents, uint32_t pos, uint32_t id) {
        if (pos >=  rel_ents.size())
            return false;
        return rel_ents[pos] == id;
    }

    inline uint32_t SystemBase::getFlagPosition_(uint32_t flag_id) {
        ASSERT_M(flag_id <= flag_positions_.size() && flag_positions_[flag_id]!=uint32_t(-1),
                 "This flag is not tracked by this system");
        return flag_positions_[flag_id];
    }

    inline FlagsMaskLong SystemBase::calcFlagsMask(std::initializer_list<uint32_t> il) {
        FlagsMaskLong fm;
        for (auto it=il.begin(); it!=il.end(); ++it) {
            fm |= 1<<flag_positions_[*it];
        }
        return fm;
    }

    template <typename SystemType>
    inline void SystemBase::init_(EntityManager& mgr, uint16_t entity_types_count, uint32_t& flags_offset_io) {
        manager_ = &mgr;
        needed_roles_ = getNeededRoles();
        relevant_entities_.resize(entity_types_count);
        FlagsMask fm = getTrackedFlags();
        flag_positions_.resize(MAX_FLAGS, uint16_t(-1));
        for (uint32_t fid=0; fid<MAX_FLAGS; ++fid) {
            if (fm[fid]) {
                ASSERT_M(flags_offset_io < MAX_FLAGS_ALL, "Not enough space in flags mask");
                flag_positions_[fid] = flags_offset_io;
                flag_positions_mask_ |= (1<<flags_offset_io);
                flags_offset_io++;
            }
        }
    }

    inline uint32_t SystemBase::findRelevantEntityPos_(fast_vector<uint32_t>& rel_ents, uint32_t entity_id) {
        int left = 0;
        int right = rel_ents.size()-1;
        while (left <= right) {
            int mid  = (left + right)/ 2;
            if (entity_id == rel_ents[mid]) {
                // found
                return (uint32_t)mid;
            }
            else if (entity_id > rel_ents[mid]) {
                left = mid+1;
            }
            else {
                right = mid-1;
            }
        }
        // not found
        return (uint32_t)left;
    }
}