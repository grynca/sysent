#include "base.h"
#include "sysent.h"
#include "entities.h"

#include <time.h>

using namespace grynca;

VersionedIndex createOrc(EntityManager<EntityTypes>& em) {
    Entity<EntityTypes>& e = em.addItem();
    Orc& o = e.set<Orc>();
    o.setRoles({EntityRoles::erCollidable, EntityRoles::erMovable});
    o.position = rand()%100;
    o.speed = rand()%10;
    return e.getId();
}

VersionedIndex createRock(EntityManager<EntityTypes>& em) {
    Entity<EntityTypes>& e = em.addItem();
    Rock& r = e.set<Rock>();
    r.setRoles({EntityRoles::erCollidable});
    r.position = rand()%100;
    return e.getId();
}

int main() {
    srand(time(0));
    EntityManager<EntityTypes> em;
    SystemManager<EntityTypes, SystemTypes> sm(em);
    sm.init();

    int n = 1e6;

    em.reserveSpaceForItems(n);
    fast_vector<VersionedIndex> entity_ids;
    entity_ids.reserve(n);

    std::cout << "Number of entities: " << std::to_string(n) << std::endl;

    {
        BlockMeasure m("Creation");
        for (uint32_t i=0; i< n; ++i) {
            switch (rand()%2) {
                case 0:
                    entity_ids.push_back(createOrc(em));
                    break;
                case 1:
                    entity_ids.push_back(createRock(em));
                    break;

        }}
    }

    {
        BlockMeasure m("Update");
        for (uint32_t i=0; i<10; ++i)
            sm.update(0.1);
        m.setDivider(10);
    }

    fast_vector<unsigned int> picked;


//    randomPickN(picked, n, n);
//    {
//        BlockMeasure m("Deletion direct");
//        while(!picked.empty()) {
//            em.removeItem(entity_ids[picked.back()]);
//            picked.pop_back();
//        }
//
//    }

    randomPickN(picked, n, n);
    {
        BlockMeasure m("Deletion defered");
        while(!picked.empty()) {
            em.getItem(entity_ids[picked.back()]).kill();
            picked.pop_back();
        }
        sm.update(0.1);
    }

    KEY_TO_CONTINUE();
    return 0;
}