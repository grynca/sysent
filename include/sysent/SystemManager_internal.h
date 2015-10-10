#ifndef SYSTEM_UPDATE_HELPER_H
#define SYSTEM_UPDATE_HELPER_H

#include "types/containers/VVector2.h"
#include "functions/meta.h"

namespace grynca {
    namespace internal {

        template <typename EntityTypes, typename SystemTypes>
        struct SystemManagerHelper {

            struct SystemFuncs {

                template <typename SystemType>
                void createFuncs() {
                    pre_update = [&] (void* s) {
                        ((SystemType*)s)->preUpdate();
                    };
                    post_update = [&] (void* s) {
                        ((SystemType*)s)->postUpdate();
                    };
                    ent_update = [&] (void* s, Entity<EntityTypes>& e, float dt) {
                        ((SystemType*)s)->update(e, dt);
                    };
                    get_mask = [&] (void* s) {
                        return ((SystemType*)s)->getNeededRoles();
                    };
                }


                std::function<void(void*)> pre_update;
                std::function<void(void*)> post_update;
                std::function<void(void*, Entity<EntityTypes>& e, float dt)> ent_update;
                std::function<RolesMask(void*)> get_mask;
            };


            SystemManagerHelper() {
                funcs_.resize(SystemTypes::getTypesCount());
                createSystems<SystemTypes>();
            }

            template<class TP>
            IF_EMPTY(TP) createSystems() { }

            template<class TP>
            IF_NOT_EMPTY(TP) createSystems() {
                uint32_t tid = SystemTypes::template pos<HEAD(TP)>();
                systems_.template add<HEAD(TP)>();
                funcs_[tid].template createFuncs<HEAD(TP)>();
                createSystems<TAIL(TP)>();
            }

            template <typename ... InitArgs>
            void init(InitArgs&&... args) {
                initSystems<SystemTypes>(std::forward<InitArgs>(args)...);
            }

            template<class TP, typename ... InitArgs>
            IF_EMPTY(TP) initSystems(InitArgs&&... args) { }

            template<class TP, typename ... InitArgs>
            IF_NOT_EMPTY(TP) initSystems(InitArgs&&... args) {
                uint32_t tid = SystemTypes::template pos<HEAD(TP)>();
                ((HEAD(TP)*)systems_.get(tid))->init(std::forward<InitArgs>(args)...);
                initSystems<TAIL(TP)>(std::forward<InitArgs>(args)...);
            }

            VVector2<SystemTypes> systems_;
            fast_vector<SystemFuncs> funcs_;
        };
    }
}

#endif //SYSTEM_UPDATE_HELPER_H

