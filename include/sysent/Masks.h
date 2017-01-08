#ifndef ROLESMASK_H
#define ROLESMASK_H

#include "types/Mask.h"

namespace grynca {
    typedef Mask<SYSENT_MAX_ROLES> RolesMask;
    typedef Mask<SYSENT_MAX_FLAGS> FlagsMask;
    typedef Mask<SYSENT_MAX_FLAGS_LONG> FlagsMaskLong;   // one flag can have multiple bits for multiple caring systems

}

#endif //ROLESMASK_H
