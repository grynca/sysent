#ifndef ENTITY_H
#define ENTITY_H

#include "types/Type.h"
#include "Masks.h"
#include "EntityIndex.h"
#include "SystemPos.h"

namespace grynca {

    // fw
    class EntityManager;
    class EntityTypeInfo;
    class Entity;
    class SystemBase;

    template <typename ... CDataTypes>
    class EntityAccessor {
    public:
        typedef TypesPack<CDataTypes...> ComponentDataTypes;

        Entity& getEntity();
        const Entity& getEntity()const;
        template <typename CDataType>
        CDataType& getData();
        template <typename CDataType>
        const CDataType& getData()const;
    protected:
        friend class Entity;
        void init_(Entity& me);

        struct GetDataPtrs {
            template <typename TP, typename T>
            static void f(Entity& e, void** data);
        };

        Entity* me_;
        void* data_[ComponentDataTypes::getTypesCount()];
    };

    class CBaseData {
    public:
        static RolesMask componentRoles() {return {};}

        u32 roles_composition_id;
        FlagsMaskLong flags_;
    };

    class Entity {
    public:
        Entity() {}

        template <typename ComponentDataType>
        ComponentDataType& getData()const;;

        template <typename ComponentType>
        ComponentType get();

        const EntityTypeInfo& getTypeInfo()const;

        void kill();

        EntityIndex getIndex()const { return index_; }
        EntityManager& getManager()const { return *mgr_; }

        // Flags:
        const FlagsMaskLong& getFlagsMask();
        void setFlag(u32 flag_id);      //  set for all systems that are tracking it
        void setFlag(u32 flag_id, SystemPos from);      // sets to only systems with larger system_id
        void clearFlag(u32 flag_id);    //  cleared for all systems that are tracking it
        bool getFlag(u32 flag_id);      // if this flag is set for any system
        bool getFlag(SystemBase* system, u32 flag_id);  // getting flags per-system

        // Roles
        const RolesMask& getRoles()const;
        void addRole(u32 role_id);
        void removeRole(u32 role_id);

        // event must derivate from EntityEvent
        template <typename EventType, typename ... ConstrArgs>
        void emitEvent(ConstrArgs&&... args)const;

        bool isValid()const { return index_ != EntityIndex::Invalid(); }
    protected:
        friend class EntityTypeInfo;
        friend class EntityManager;
        friend class EntitiesList;

        CBaseData& getBase_();
        const CBaseData& getBase_()const;

        void clearTrackedFlagsForSystem_(SystemBase* system);

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

    class EntityEvent {
    public:
        const Entity& getEntity()const { return e_; }
    private:
        friend class Entity;
        Entity e_;
    };

    template <typename...CompTypes>
    class EntityDef {
    public:
        using ComponentTypes = TypesPack<CBaseData, CompTypes...>;
    };
}

#include "Entity.inl"
#endif //ENTITY_H
