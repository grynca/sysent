#ifndef SYSTEMPIPELINE_H
#define SYSTEMPIPELINE_H

#include "types/containers/fast_vector.h"
#include "functions/profiling.h"

namespace grynca {

    // fw
    class SystemBase;

    struct SystemsPipeline {
        fast_vector<SystemBase*> systems;
        fast_vector<SystemBase*> systems_by_type;    // indexed with internal type id of system

    private:
        friend class EntityManager;
        PROFILE_ID_DEF(upd_prof_);
    };

}

#endif //SYSTEMPIPELINE_H
