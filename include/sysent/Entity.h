#ifndef ENTITY_H
#define ENTITY_H

#include "types/Type.h"
#include "Masks.h"
#include "EntityIndex.h"
#include <bitset>

#define MAX_ENTITY_COMPS 32
#define MAX_COMPONENT_SIZE 64       // must fit to cache line

namespace grynca {

    // fw
    class EntityManager;
    class EntityTypeInfo;
    class System;

    class CBase {
    public:
        static RolesMask componentRoles() {return {};}
    private:
        friend class Entity;
        friend class EntityManager;

        RolesMask roles_;

        // Double buffering for flags
        FlagsMask flags_;           // resolved flags
        FlagsMask next_flags_;      // not yet resolved flags
    };


    class Entity {
    public:
        Entity() {}

        template <typename ComponentType>
        ComponentType& getComponent();

        template <typename ComponentType>
        const ComponentType& getComponent()const;

        const EntityTypeInfo& getTypeInfo()const;

        void kill();
        void create();

        EntityIndex getIndex()const { return index_; }
        EntityManager& getManager()const { return *mgr_; }

        // Roles
        RolesMask& accRoles();
        const RolesMask& getRoles();
        void addRole(u32 role_id);
        void removeRole(u32 role_id);

        // Flags:
        FlagsMask& accFlags();
        const FlagsMask& getFlags()const;
        void setFlag(u32 flag_id);
        void setFlags(const FlagsMask& fm);
        FlagsMask& accNextFlags();
        const FlagsMask& getNextFlags()const;

        bool isValid() { return index_ != EntityIndex::Invalid(); }
    protected:
        friend class EntityTypeInfo;
        friend class EntityManager;
        friend class System;
        friend class SystemFlagged;

        CBase& getBase_();
        const CBase& getBase_()const;

        template <typename ComponentTypes>
        static RolesMask getInitialComponentsRoles_();

        struct InitialRolesGetter_ {
            template <typename TP, typename T>
            static void f(RolesMask& rm) {
                rm |= T::componentRoles();
            };
        };

        EntityIndex index_;
        EntityManager* mgr_;
    };

    template <typename...CompTypes>
    class EntityDef {
    public:
        using ComponentTypes = TypesPack<CBase, CompTypes...>;
    };
}

#include "Entity.inl"
#endif //ENTITY_H
