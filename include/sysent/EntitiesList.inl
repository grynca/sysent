#include "EntitiesList.h"
#include "functions/sort_utils.h"

namespace grynca {

    template <typename CompTypes>
    template <typename CT>
    inline const CT& CompsPtrs<CompTypes>::get()const {
        u32 pos = CompTypes::template pos<CT>();
        ASSERT_M(pos!=-1, "Invalid Component Type.");
        return *(CT*)ptrs_[pos];
    }

    template <typename CompTypes>
    template <typename CT>
    inline const CT* CompsPtrs<CompTypes>::getPtr()const {
        u32 pos = CompTypes::template pos<CT>();
        ASSERT_M(pos!=-1, "Invalid Component Type.");
        return *(CT*)ptrs_[pos];
    }

    template <typename CompTypes>
    template <typename CT>
    inline CT& CompsPtrs<CompTypes>::acc() {
        u32 pos = CompTypes::template pos<CT>();
        ASSERT_M(pos!=-1, "Invalid Component Type.");
        return (CT*)ptrs_[pos];
    }

    template <typename CompTypes>
    template <typename CT>
    inline CT* CompsPtrs<CompTypes>::accPtr() {
        u32 pos = CompTypes::template pos<CT>();
        ASSERT_M(pos!=-1, "Invalid Component Type.");
        return (CT*)ptrs_[pos];
    }

    inline EntitiesList::EntitiesList(SystemBase* sys)
     : system_(sys), ents_cnt_(0), pool_(NULL),
       looped_tid_(u16(-1)), loop_scanner_(NULL, 0)
    {
        looped_e_.mgr_ = NULL;
    }

    inline void EntitiesList::init(EntityManager& mgr, u32 entity_types_cnt) {
        looped_e_.mgr_ = &mgr;
        ents_.resize(entity_types_cnt, 1000);
        last_word_with_ent_.resize(entity_types_cnt, 0);
    }

    inline Entity& EntitiesList::initLoop() {
        nextTypeInner_(0);
        return looped_e_;
    }

    inline void EntitiesList::nextType() {
        ASSERT(looped_tid_ != u16(-1));
        nextTypeInner_(looped_tid_+1);
    }

    inline void EntitiesList::nextIndex() {
        ASSERT(checkIndex());
        nextIndexInner_();
    }

    inline bool EntitiesList::checkType() {
        return looped_tid_ != u16(-1);
    }
    inline bool EntitiesList::checkIndex() {
        return loop_scanner_.isValid();
    }

    template <typename EntityFunc>
    inline void EntitiesList::loopEntities(const EntityFunc& loop_f) {
        for (Entity& e = initLoop(); checkType(); nextType()) {
            while (checkIndex()) {
                loop_f(e);
                looped_e_.clearTrackedFlagsForSystem(system_);
                nextIndex();
            }
        }
    }

    template <typename ComponentTypes, typename EntityFunc>
    inline void EntitiesList::loopEntities(const EntityFunc& loop_f) {
        CompsPtrs<ComponentTypes> cptrs;
        ChunkedBuffer* comp_bufs[ComponentTypes::getTypesCount()];
        for (Entity& e = initLoop(); checkType(); nextType()) {
            getManager().getComponentsBufs<ComponentTypes>(looped_tid_, comp_bufs);
            while (checkIndex()) {
                for (u32 i=0; i<ComponentTypes::getTypesCount(); ++i) {
                    cptrs.accPtrs()[i] = comp_bufs[i]->accItem(looped_e_.getIndex().getEntityIndex());
                }
                loop_f(cptrs, e);
                looped_e_.clearTrackedFlagsForSystem(system_);
                nextIndex();
            }
        }
    }

    template <typename EntityFunc>
    inline void EntitiesList::loopEntitiesWOCF(const EntityFunc& loop_f) {
        for (Entity& e = initLoop(); checkType(); nextType()) {
            while (checkIndex()) {
                loop_f(e);
                nextIndex();
            }
        }
    }

    template <typename ComponentTypes, typename EntityFunc>
    inline void EntitiesList::loopEntitiesWOCF(const EntityFunc& loop_f) {
        CompsPtrs<ComponentTypes> cptrs;
        ChunkedBuffer* comp_bufs[ComponentTypes::getTypesCount()];
        for (Entity& e = initLoop(); checkType(); nextType()) {
            getManager().getComponentsBufs<ComponentTypes>(looped_tid_, comp_bufs);
            while (checkIndex()) {
                for (u32 i=0; i<ComponentTypes::getTypesCount(); ++i) {
                    cptrs.accPtrs()[i] = comp_bufs[i]->accItem(looped_e_.getIndex().getEntityIndex());
                }
                loop_f(cptrs, e);
                nextIndex();
            }
        }
    }

    inline EntityManager& EntitiesList::getManager() {
        return looped_e_.getManager();
    }

    inline u32 EntitiesList::getCount()const {
        return ents_cnt_;
    }

    inline bool EntitiesList::isCurrentlyLooping(u16 entity_type)const {
        return entity_type == looped_tid_;
    }

    inline bool EntitiesList::addEntity(EntityIndex eid) {
        u32 tid = eid.getEntityTypeId();
        u32 id = eid.getEntityIndex();
        if (ents_[tid].set(id)) {
            ++ents_cnt_;

            u32 word_id = id / Bits::word_bits;
            if (word_id > last_word_with_ent_[tid]) {
                last_word_with_ent_[tid] = word_id;
            }
            return true;
        }
        return false;
    }

    inline bool EntitiesList::removeEntity(EntityIndex eid) {
        u32 tid = eid.getEntityTypeId();
        u32 id = eid.getEntityIndex();
        if (ents_[tid].reset(id)) {
            --ents_cnt_;

            u32 word_id = id / Bits::word_bits;
            if (word_id == last_word_with_ent_[tid]) {
                // find new last word
                word_id = last_word_with_ent_[tid];
                while (word_id > 0) {
                    if (ents_[tid].getWords()[word_id])
                        break;
                    --word_id;
                }
                last_word_with_ent_[tid] = word_id;
            }

            return true;
        }
        return false;
    }

    inline void EntitiesList::clear() {
        for (u32 i=0; i<ents_.size(); ++i) {
            ents_[i].clear();
        }
        ents_cnt_ = 0;
    }

    inline u32 EntitiesList::calcMemoryUsage()const {
        u32 rslt = sizeof(EntitiesList);
        rslt += last_word_with_ent_.size()*sizeof(u32);
        rslt += ents_.size()*sizeof(Bits);
        for (u32 i=0; i<ents_.size(); ++i) {
            rslt += ents_[i].getBytesCount();
        }
        return rslt;
    }

    inline void EntitiesList::nextTypeInner_(u32 pos) {
        looped_tid_ = pos;
        for (; looped_tid_<ents_.size(); ++looped_tid_) {
            if (ents_[looped_tid_].getOnesCount()) {
                u16 ent_type_id = u16(looped_tid_);
                pool_ = &looped_e_.mgr_->getEntitiesPool(ent_type_id);
                looped_e_.index_.setEntityTypeId(ent_type_id);
                loop_scanner_ = ents_[looped_tid_].getIterator(last_word_with_ent_[ent_type_id]+1);
                nextIndexInner_();
                return;
            }
        }
        looped_tid_ = u16(-1);
    }

    inline void EntitiesList::nextIndexInner_() {
        if (loop_scanner_++) {
            pool_->getIndexForPos2(loop_scanner_.getPos(), looped_e_.index_.accInnerIndex());
        }
    }
}