#ifndef ENTITY_PROPS_H
#define ENTITY_PROPS_H

#include "functions/meta.h"

#define DECLARE_PROP(PROP) \
template<class T> \
using PROP##_t = decltype(std::declval<T>().PROP); \
template<class T> \
using has_##PROP = grynca::can_apply<PROP##_t, T>

namespace grynca {
    namespace props {
        DECLARE_PROP(speed);
        DECLARE_PROP(position);
    }
}

#endif //ENTITY_PROPS_H
