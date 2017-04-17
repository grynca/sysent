#ifndef ENTITIESLIST_H
#define ENTITIESLIST_H

#include "Entity.h"
#include "types/Bits.h"


namespace grynca {

    class EntitiesList {
    public:
        EntitiesList(SystemBase* sys);
        virtual ~EntitiesList() {}

        virtual void init(EntityManager& mgr, u32 entity_types_cnt);

        virtual Entity& initLoop();
        void nextType();
        void nextIndex();
        bool checkType();
        bool checkIndex();
        template <typename EntityFunc>
        void loopEntities(const EntityFunc& loop_f);

        EntityManager& getManager();
        u32 getCount()const;

        bool isCurrentlyLooping(u16 entity_type)const;

        // returns if actually added/removed
        bool addEntity(EntityIndex eid);
        bool removeEntity(EntityIndex eid);

        void clear();
    protected:
        friend class SystemBase;

        void nextTypeInner_(u32 pos);
        void nextIndexInner_();

        // for each entity type vector of positions in pool
        //  (pool is with holes so indices are stable)
        SystemBase* system_;
        Entity looped_e_;
        fast_vector<Bits> ents_;
        fast_vector<u32> last_word_with_ent_;       // last word of bitfield which contains set entity
        u32 ents_cnt_;

        // current loop pos
        EntitiesPool* pool_;
        u32 looped_tid_;
        BitScanner<Bits::word_type> loop_scanner_;
    };
}

#include "EntitiesList.inl"
#endif //ENTITIESLIST_H
