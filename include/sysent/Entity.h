#ifndef ENTITY_H
#define ENTITY_H

#include "types/Type.h"
#include "Mask.h"
#include "EntityIndex.h"
#include <bitset>

namespace grynca {

    // fw
    class EntityManager;
    class EntityTypeInfo;
    class SystemBase;

    class CBase {
    public:
        static RolesMask componentRoles() {return {};}
    private:
        friend class Entity;
        friend class EntityManager;

        RolesMask roles_;
        FlagsMaskLong flags_;
    };


    class Entity {
    public:
        Entity() {}

        template <typename ComponentType>
        ComponentType& getComponent();

        template <typename ComponentType>
        const ComponentType& getComponent()const;

        const EntityTypeInfo& getTypeInfo()const;

        void updateDataPointer();
        void kill();

        EntityIndex getIndex()const { return index_; }
        EntityManager& getManager()const { return *mgr_; }
        uint8_t* getComponentsData() { return comps_data_; }

        // roles & flags setting
        const RolesMask& getRoles();
        void setRoles(const RolesMask& roles);
        bool hasRoles(const RolesMask& roles);
        void addRoles(const RolesMask& roles);

        // Flags:
        const FlagsMaskLong& getFlagsMask();
        void setFlag(uint8_t flag_id);      //  set for all systems that are tracking it
        void clearFlag(uint8_t flag_id);    //  cleared for all systems that are tracking it
        bool getFlag(SystemBase* system, uint8_t flag_id);  // getting flags is per-system

        uint8_t* getData();
        const uint8_t* getData()const;

        bool isValid() { return index_ != EntityIndex::Invalid(); }

    protected:
        friend class EntityTypeInfo;
        friend class EntityManager;

        void clearTrackedFlagsForSystem_(SystemBase* system);
        CBase& getBase_();

        template <typename ComponentTypes>
        static RolesMask getComponentsRoles_();

        struct InitialRolesGetter_ {
            template <typename TP, typename T>
            static void f(RolesMask& rm) {
                rm |= T::componentRoles();
            };
        };

        uint8_t* comps_data_;
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
