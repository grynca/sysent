#ifndef SYSTEMPOS_H
#define SYSTEMPOS_H

#include "types/Index.h"

namespace grynca {

    struct SystemPos {
        SystemPos() : pipeline_id(InvalidId()), system_id(InvalidId()) {}
        SystemPos(u32 pl_id, u32 sys_id) : pipeline_id(pl_id), system_id(sys_id) {}

        bool isValid() { return pipeline_id != InvalidId(); }

        u32 pipeline_id;
        u32 system_id;
    };

}

#endif //SYSTEMPOS_H
