#ifndef SYSTEM_UPDATE_HELPER_H
#define SYSTEM_UPDATE_HELPER_H
#include "functions/meta.h"

namespace grynca {
    namespace internal {

        struct SystemManagerHelper {
            SystemManagerHelper(System **systems) {
                createSystems<SystemTypes>(systems);
            }


            template<class TP>
            IF_EMPTY(TP) createSystems(System **systems) { }

            template<class TP>
            IF_NOT_EMPTY(TP) createSystems(System **systems) {
                systems[SystemTypes::pos<HEAD(TP)>()] = new HEAD(TP)();
                createSystems<TAIL(TP)>(systems);
            }

        };
    }
}

#endif //SYSTEM_UPDATE_HELPER_H

