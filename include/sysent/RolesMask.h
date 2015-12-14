#ifndef ROLESMASK_H
#define ROLESMASK_H

#include <bitset>

namespace grynca {

    class RolesMask {
    public:
        static constexpr int MAX_ROLES = 128;

        RolesMask() {}
        RolesMask(std::initializer_list<int> il) {
            for (auto it = il.begin(); it!=il.end(); ++it) {
                set(*it);
            }
        }

        template <typename Role>
        void set(Role role) {
            roles_mask_.set(role);
        }

        template <typename Role, typename... Roles>
        void set(Role role, Roles... roles) {
            set(role);
            set(roles...);
        }

        bool operator== (const RolesMask & rhs) const {
            return rhs.roles_mask_ == roles_mask_;
        }

        friend RolesMask operator& (const RolesMask& lhs, const RolesMask& rhs);
        friend RolesMask operator| (const RolesMask& lhs, const RolesMask& rhs);
    private:
        std::bitset<MAX_ROLES> roles_mask_;
    };

    inline RolesMask operator& (const RolesMask& lhs, const RolesMask& rhs) {
        RolesMask rm;
        rm.roles_mask_ = lhs.roles_mask_&rhs.roles_mask_;
        return rm;
    }

    inline RolesMask operator| (const RolesMask& lhs, const RolesMask& rhs) {
        RolesMask rm;
        rm.roles_mask_ = lhs.roles_mask_|rhs.roles_mask_;
        return rm;
    }
}

#endif //ROLESMASK_H
