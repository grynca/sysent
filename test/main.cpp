#include "base.h"
#include "sysent.h"
#include "entities.h"

#include <time.h>

using namespace grynca;

EntityIndex createOrc(EntityManager& em) {
    Entity o = em.createEntity(EntityTypes::pos<Orc>());
    o.getComponent<CMovable>().position = rand()%100;
    o.getComponent<CMovable>().speed = rand()%10;
    return o.getIndex();
}

EntityIndex createRock(EntityManager& em) {
    Entity r = em.createEntity(EntityTypes::pos<Rock>());
    r.getComponent<CMovable>().position = rand()%100;
    r.getComponent<CMovable>().speed = 0;
    return r.getIndex();
}

int main() {
    srand(time(0));
    int n = 1e6;
    EntityManager em;
    em.init<EntityTypes>(n, 1);
    em.addSystem<TeleportSystem>(0);
    em.addSystem<MovementSystem>(0);

    fast_vector<EntityIndex> entity_ids;
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

            }
        }
    }

    {
        BlockMeasure m("Update");
        for (uint32_t i=0; i<10; ++i) {
            em.updateSystemsPack(0, 0.1);
            m.incCounter();
        }
    }

    fast_vector<unsigned int> picked;


    randomPickN(picked, n, n);
    {
        BlockMeasure m("Deletion");
        while(!picked.empty()) {
            em.getEntity(entity_ids[picked.back()]).kill();
            picked.pop_back();
        }
        em.updateSystemsPack(0, 0.1);
    }

    KEY_TO_CONTINUE();
    return 0;
}