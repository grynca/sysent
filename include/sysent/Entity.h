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

    namespace internal {

        struct GetTypesRoles {
            template <typename TP, typename T>
            static void f(RolesMask& rm) { rm |= T::componentRoles(); };
        };
    }

    class CBase {
    public:
        static RolesMask componentRoles() {return {};}

        u32 roles_composition_id;
        FlagsMaskLong flags_;
    };

    class Entity {
    public:
        Entity() {}

        template <typename ComponentDataType>
        ComponentDataType* getData()const;

        template <typename EntityAccessor>
        EntityAccessor get();

        // calls .init(args) on Accessor
        template <typename EntityAccessor, typename ... Args>
        EntityAccessor getAndInit(Args&&... args);

        const EntityTypeInfo& getTypeInfo()const;

        void kill();

        EntityIndex getIndex()const { return index_; }
        EntityIndex& accIndex() { return index_; }
        EntityManager& getManager()const { return *mgr_; }

        // Flags:
        const FlagsMaskLong& getFlags();
        void setFlag(u32 flag_id, void* data = NULL);      //  set for all systems that are tracking it
        void setFlag(u32 flag_id, SystemPos from, void* data = NULL);      // sets to only systems with larger system_id
        void clearFlag(u32 flag_id);    //  cleared for all systems that are tracking it
        bool getFlag(u32 flag_id);      // if this flag is set for any system
        bool getFlag(SystemBase* system, u32 flag_id);  // getting flags per-system

        void clearTrackedFlagsForSystem(SystemBase* system);

        // Roles
        const RolesMask& getRoles()const;
        void addRole(u32 role_id);
        void removeRole(u32 role_id);

        // event must derivate from EntityEvent
        template <typename EventType, typename ... ConstrArgs>
        void emitEvent(ConstrArgs&&... args)const;

        bool isValid()const;

        template <typename FuncType>
        void callOnEntity(const FuncType& f);

        template <typename ComponentTypes>
        static constexpr RolesMask getStaticComponentRoles();
    protected:
        friend class EntityTypeInfo;
        friend class EntityManager;
        friend class EntitiesList;

        CBase& getBase_();
        const CBase& getBase_()const;

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

    // caches pointers to data buffers for components
    template <typename ... CDataTypes>
    class EntityCachedComps {
        typedef TypesPack<CDataTypes...> ComponentDataTypes;
    public:
        EntityCachedComps();

        void cacheAll(EntityManager& emgr, u16 entity_type_id);

        template <typename CompsTypesPack>
        void cache(EntityManager& emgr, u16 entity_type_id);

        template <typename CDataType>
        CDataType* getData(EntityIndex eid);
        template <typename CDataType>
        const CDataType* getData(EntityIndex eid)const;
    private:
        ChunkedBuffer* comp_bufs_[ComponentDataTypes::getTypesCount()];
    };

    template <typename ... CDataTypes>
    class EntityAccessor {
    public:
        DEF_CONSTR_AND_MOVE_ONLY(EntityAccessor);

        typedef TypesPack<CDataTypes...> ComponentDataTypes;
        static constexpr RolesMask getStaticComponentRoles();

        Entity& accEntity();
        const Entity& getEntity()const;
        EntityIndex getEntityIndex()const;
        template <typename CDataType>
        CDataType* getData();
        template <typename CDataType>
        const CDataType* getData()const;

        // get another accessor from entity
        template <typename EntAcc>
        EntAcc get();
        // init another accessor from entity
        template <typename EntAcc, typename ... Args>
        EntAcc getAndInit(Args&&... args);

        bool isValid()const;

        template <typename FuncType>
        void callOnEntity(const FuncType& f);

    protected:
        friend class Entity;
        template <typename...> friend class EntityAccessor;

        // override in derivates, called after me_ is initialized
        void construct() {}
    private:
        void init_(const Entity& e);

        Entity me_;
        EntityCachedComps<CDataTypes...> cached_comps_;
    };

    template <typename...CompTypes>
    class EntityDef : public EntityAccessor<CBase, CompTypes...> {
        typedef EntityAccessor<CBase, CompTypes...> Base;
    public:
        DEF_CONSTR_AND_MOVE_ONLY(EntityDef);
    };
}

#include "Entity.inl"
#endif //ENTITY_H
