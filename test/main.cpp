#include "entities.h"
#include <time.h>

using namespace grynca;

EntityIndex createOrc(EntityManager& em) {
    Entity o = em.newEntity(EntityTypes::pos<Orc>());
    o.getComponent<CMovable>().position = rand()%3000 + 4000;
    o.getComponent<CMovable>().speed = rand()%1000;
    o.create();
    return o.getIndex();
}

EntityIndex createRock(EntityManager& em) {
    Entity r = em.newEntity(EntityTypes::pos<Rock>());
    r.getComponent<CMovable>().position = rand()%5000 + 2000;
    r.getComponent<CMovable>().speed = 0;
    r.create();
    return r.getIndex();
}

int main() {
    srand(time(0));
    u32 n = 1e6;
    EntityManager em;
    em.init<EntityTypes>(n);
    TeleportSystem& ts = em.addSystem<TeleportSystem>(0);
    MovementSystem& ms = em.addSystem<MovementSystem>(0);
    CheckBoundsSystem& chbs = em.addSystem<CheckBoundsSystem>(0);

    fast_vector<EntityIndex> entity_ids;
    entity_ids.reserve(n);

    std::cout << "Number of entities: " << string_utils::toString(n) << std::endl;

    {
        BlockMeasure m("Creation");
        for (u32 i=0; i< n; ++i) {
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
        Measure m;
        for (u32 i=0; i<10; ++i) {
            m.from();
            em.updateSystemsPipeline(0, 0.1);
            std::cout << "teleported: " << ts.teleported_ << ", moved: " << ms.moved_ << ", oob: " << chbs.fixed_pos_ << std::endl;
            m.to();
        }
        m.print("Update");
    }

    fast_vector<unsigned int> picked;


    randomPickN(picked, n, n);
    {
        BlockMeasure m("Deletion");
        while(!picked.empty()) {
            em.getEntity(entity_ids[picked.back()]).kill();
            picked.pop_back();
        }
    }
    em.updateSystemsPipeline(0, 0.1);

#ifdef PROFILE_BUILD
    std::cout << em.getProfileString();
#endif

    WAIT_FOR_KEY_ON_WIN();
    return 0;
}