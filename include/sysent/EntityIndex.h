#ifndef ENTITYINDEX_H
#define ENTITYINDEX_H

namespace grynca {

    class EntityIndex {
    public:
        struct Hasher {
            uint64_t operator()(const EntityIndex& vi) const;
        };

        EntityIndex() {}
        EntityIndex(uint32_t id, uint16_t type_id, uint16_t version = 0)
         : index_(type_id, version)
        {
            setEntityTypeId_(type_id);
        }

        static const EntityIndex& Invalid() {
            static EntityIndex i;
            return i;
        }

        uint32_t getEntityIndex()const { return index_.getIndex(); }
        uint16_t getEntityTypeId()const { return index_.getUnused(); }
        uint16_t getVersion()const { return index_.getVersion(); }
    private:
        friend class EntityManager;
        friend bool operator==(const EntityIndex& i1, const EntityIndex& i2);
        friend bool operator!=(const EntityIndex& i1, const EntityIndex& i2);

        void setEntityIndex_(uint32_t id) { index_.setIndex(id); }
        void setEntityTypeId_(uint16_t et) { index_.setUnused(et); }

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

    inline uint64_t EntityIndex::Hasher::operator()(const EntityIndex& vi) const {
        return vi.index_.getUID();
    }
}

#endif //ENTITYINDEX_H
