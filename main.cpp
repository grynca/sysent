#include "base.h"
#include "src/sysent.h"

#include <time.h>

using namespace grynca;

VersionedIndex createOrc(EntityManager& em) {
    Entity& e = em.addItem();
    e.setRoles(erCollidable | erMovable);
    Orc& o = e.set<Orc>();
    o.position = rand()%100;
    o.speed = rand()%10;
    return e.getId();
}

VersionedIndex createRock(EntityManager& em) {
    Entity& e = em.addItem();
    e.setRoles(erCollidable);
    Rock& r = e.set<Rock>();
    r.position = rand()%100;
    return e.getId();
}

int main() {
    srand(time(0));
    EntityManager em;
    SystemManager sm;

    int n = 1e7;

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
            sm.updateSystem<MovementSystem>(em, 0.1);
        m.setDivider(10);
    }

    fast_vector<unsigned int> picked;
    randomPickN(picked, n, n);
    {
        BlockMeasure m("Deletion");
        while(!picked.empty()) {
            em.removeItem(entity_ids[picked.back()]);
            picked.pop_back();
        }

    }

    KEY_TO_CONTINUE();
    return 0;
}