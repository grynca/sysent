#ifndef ENTITYINDEX_H
#define ENTITYINDEX_H

namespace grynca {

    class EntityIndex {
    public:
        struct Hasher {
            u64 operator()(const EntityIndex& vi) const;
        };

        EntityIndex() {}
        EntityIndex(u32 id, u16 type_id, u16 version = 0)
         : index_(type_id, version)
        {
            setEntityTypeId(type_id);
        }

        static const EntityIndex& Invalid() {
            static EntityIndex i;
            return i;
        }

        u32 getEntityIndex()const { return index_.getIndex(); }
        u16 getEntityTypeId()const { return index_.getUnused(); }
        u16 getVersion()const { return index_.getVersion(); }

        Index& accInnerIndex() { return index_; }
        const Index& getInnerIndex()const { return index_; }
        void setEntityIndex(u32 id) { index_.setIndex(id); }
        void setEntityTypeId(u16 et) { index_.setUnused(et); }
    private:
        friend bool operator==(const EntityIndex& i1, const EntityIndex& i2);
        friend bool operator!=(const EntityIndex& i1, const EntityIndex& i2);

        Index index_;
    };

    inline std::ostream& operator<<(std::ostream& os, const EntityIndex& id) {
        os << "EntID[" << id.getEntityTypeId() << ", " << id.getEntityIndex() << "]";
        return os;
    }

    inline bool operator==(const EntityIndex& i1, const EntityIndex& i2) {
        return i1.index_ == i2.index_;
    }

    inline bool operator!=(const EntityIndex& i1, const EntityIndex& i2) {
        return i1.index_ != i2.index_;
    }

    inline u64 EntityIndex::Hasher::operator()(const EntityIndex& vi) const {
        return vi.index_.getUID();
    }
}

#endif //ENTITYINDEX_H
