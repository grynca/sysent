#ifndef SYSTEMLOOPFLAGGED_H
#define SYSTEMLOOPFLAGGED_H
#include "System.h"

namespace grynca {

    // Entities are added (by resolveFlags()) & removed (after update) each frame
    class SystemFlagged : public System {
    public:
        const FlagsMask& getNeededFlags()const { return needed_flags_; }

    protected:
        virtual FlagsMask NeededFlagsAny() { return {}; }
        virtual FlagsMask NeededFlagsAll() { return {}; }

    private:
        friend class EntityManager;

        void addFlaggedEntity_(Entity& e, FlagsMask& curr_flags);
        virtual void update_(Entity& e, f32 dt) override;
        virtual void init_(EntityManager& mgr, u16 entity_types_count, u32 pipeline_id) override;

        bool flags_any_;
        FlagsMask needed_flags_;
    };

}

#include "SystemFlagged.inl"
#endif //SYSTEMLOOPFLAGGED_H
