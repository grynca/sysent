#ifndef ENTITY_H
#define ENTITY_H

#include "types/Type.h"
#include "Masks.h"
#include "EntityIndex.h"
#include <bitset>

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

        u32 roles_mask_id_;
        FlagsMaskLong flags_;
    };


    class Entity {
    public:
        Entity() {}

        template <typename ComponentType>
        ComponentType& getComponent();

        template <typename ComponentType>
        const ComponentType& getComponent()const;

        template <typename ComponentType>
        typename ComponentType::Setter getComponentSetter();

        const EntityTypeInfo& getTypeInfo()const;

        void kill();
        void create();

        EntityIndex getIndex()const { return index_; }
        EntityManager& getManager()const { return *mgr_; }

        // Roles
        const RolesMask& getRoles()const;
        void addRole(u32 role_id);
        void removeRole(u32 role_id);

        // Flags:
        const FlagsMaskLong& getFlagsMask();
        void setFlag(u32 flag_id);      //  set for all systems that are tracking it
        void setFlag(u32 flag_id, u32 from_system_id);      // sets to only systems with larger system_id
        void clearFlag(u32 flag_id);    //  cleared for all systems that are tracking it
        bool getFlag(u32 flag_id);      // if this flag is set for any system
        bool getFlag(System* system, u32 flag_id);  // getting flags per-system

        bool isValid()const { return index_ != EntityIndex::Invalid(); }
    protected:
        friend class EntityTypeInfo;
        friend class EntityManager;
        friend class System;
        friend class FlaggedSystem;

        CBase& getBase_();
        const CBase& getBase_()const;
        void clearTrackedFlagsForSystem_(System* system);

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
