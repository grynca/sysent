#ifndef SYSTEMLOOPFLAGGED_H
#define SYSTEMLOOPFLAGGED_H
#include "System.h"
#include <functional>

namespace grynca {

    class FlaggedSystem : public System {
    public:
        typedef std::function<void(u16/*type id*/, fast_vector<u32>& /*entity ids*/)> SortBeforeUpdateFunc;
    public:
        FlaggedSystem();
        void setSortBeforeUpdate(const SortBeforeUpdateFunc& sf) { sort_before_upd_ = sf; }

        const FlagsMask& getNeededFlags() { return needed_flags_; }
        FlagsMaskLong& getNeededFlagsMask() { return needed_flags_positions_; }
    protected:
        virtual FlagsMask NeededFlags() = 0;
    private:
        friend class EntityManager;
        friend class Entity;

        void addFlaggedEntity_(Entity& e);
        virtual void update_(Entity& e, f32 dt) override;
        virtual void init_(EntityManager& mgr, u16 entity_types_count, u32 pipeline_id, u32 system_id, u32& flags_offset_io) override;

        FlagsMask needed_flags_;
        FlagsMaskLong needed_flags_positions_;
        SortBeforeUpdateFunc sort_before_upd_;
    };

}

#include "FlaggedSystem.inl"
#endif //SYSTEMLOOPFLAGGED_H
