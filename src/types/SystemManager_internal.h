#ifndef SYSTEM_UPDATE_HELPER_H
#define SYSTEM_UPDATE_HELPER_H
#include "functions/meta.h"

namespace grynca {
    namespace internal {

        typedef void (*updateEntitiesFunc)(void *system, Entity &entity, double dt);

        template<class S, class E>
        using update_call_t = decltype(std::declval<S>().update(std::declval<Entity &>(), std::declval<E &>(), 0.0));

        template<class S, class E>
        using has_update = grynca::can_apply<update_call_t, S, E>;

        namespace updates {
            template<class S, class E>
            typename std::enable_if<has_update<S, E>{}>::type
            update(S *system, Entity &entity, E *ent_type, double dt) {
                system->update(entity, *ent_type, dt);
            }

            void update(void *, Entity &, void *, double) { }
        }

        struct UpdateFuncs {
            updateEntitiesFunc funcs[SystemTypes::getTypesCount()][EntityTypes::getTypesCount()];
        };


        struct SystemManagerHelper {
            SystemManagerHelper(System **systems, UpdateFuncs &funcs) {
                createSystems<SystemTypes>(systems);
                createUpdateFuncs<SystemTypes, EntityTypes>(funcs);
            }


            template<class TP>
            IF_EMPTY(TP) createSystems(System **systems) { }

            template<class TP>
            IF_NOT_EMPTY(TP) createSystems(System **systems) {
                systems[SystemTypes::pos<HEAD(TP)>()] = new HEAD(TP)();
                createSystems<TAIL(TP)>(systems);
            }

            template<typename TP1, typename TP2>
            IF_EMPTY(TP1) createUpdateFuncs(UpdateFuncs &funcs) { }

            template<typename TP1, typename TP2>
            IF_NOT_EMPTY(TP1) createUpdateFuncs(UpdateFuncs &funcs) {
                addEntityFuncs<HEAD(TP1), TP2>(funcs);
                createUpdateFuncs<TAIL(TP1), TP2>(funcs);
            }


            template<typename S, typename TP>
            IF_EMPTY(TP) addEntityFuncs(UpdateFuncs &funcs) { }

            template<typename S, typename TP>
            IF_NOT_EMPTY(TP) addEntityFuncs(UpdateFuncs &funcs) {
                funcs.funcs[SystemTypes::pos<S>()][EntityTypes::pos<HEAD(TP)>()] = updateFunc < S, HEAD(TP) >;
                addEntityFuncs<S, TAIL(TP)>(funcs);
            }

            template<class S, class E>
            static void updateFunc(void *system, Entity &entity, double dt) {
                using internal::updates::update;
                update(static_cast<S *>(system), entity, &entity.get<E>(), dt);
            }

        };
    }
}

#endif //SYSTEM_UPDATE_HELPER_H
