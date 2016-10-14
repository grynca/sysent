#ifndef ROLESMASK_H
#define ROLESMASK_H

#include <bitset>

#ifndef MAX_ROLES
#   define MAX_ROLES 32
#endif
#ifndef MAX_FLAGS
#   define MAX_FLAGS 32
#endif
#ifndef MAX_FLAGS_ALL
#   define MAX_FLAGS_ALL 64
#endif

namespace grynca {

    template <int S>
    class Mask : public std::bitset<S> {
        typedef std::bitset<S> Parent;
    public:
        Mask() : Parent(0) {}

        Mask(std::initializer_list<uint32_t> il) {
            for (auto it = il.begin(); it!=il.end(); ++it) {
                Parent::set(*it);
            }
        }
    };

    typedef Mask<MAX_ROLES> RolesMask;
    typedef Mask<MAX_FLAGS> FlagsMask;
    typedef Mask<MAX_FLAGS_ALL> FlagsMaskLong;   // one flag can have multiple bits for multiple caring systems
}

#endif //ROLESMASK_H
