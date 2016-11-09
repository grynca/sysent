#ifndef ROLESMASK_H
#define ROLESMASK_H

#include "types/Mask.h"

// MAX_ROLES & MAX_FLAGS must be defined before including

namespace grynca {
    typedef Mask<ROLES_CNT> RolesMask;
    typedef Mask<FLAGS_CNT> FlagsMask;
}

#endif //ROLESMASK_H
