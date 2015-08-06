#ifndef SYSTEM_H
#define SYSTEM_H

#include "../defs.h"
#include "types/Manager.h"
#include "types/Call.h"
#include "functions/meta.h"

namespace grynca {

    class System {
    public:
        System() : system_id_(-1) { }

        virtual ~System() { }

        int32_t getSystemId() { return system_id_; }

        virtual RolesMask getNeededRoles() = 0;

    private:
        friend class SystemManager;

        int32_t system_id_;
    };
}

#endif //SYSTEM_H
