#ifndef SYSENT_ENTX_EXAMPLE_H
#define SYSENT_ENTX_EXAMPLE_H

DEFINE_ENUM(EntityRoles,
            erMovable,
            erRenderable,
            erParticle,
            erCollidable
);

DEFINE_ENUM(EntityFlags,
            efDummy
);

#define SYSENT_MAX_ROLES EntityRoles::end
#define SYSENT_MAX_FLAGS EntityFlags::end

#include "sysent.h"
#include "functions/undefs.h"
#include "glm/glm.hpp"
#include "functions/defs.h"

#define PI 3.141592654f

struct CBody {
    static RolesMask componentRoles() {
        return EntityRoles::erMovableMask();
    }

    CBody()
     : rotation(0.0f), rotationd(0.0f), alpha(0.0f)
    {}

    glm::vec2 position;
    glm::vec2 direction;
    f32 rotation;
    f32 rotationd;
    f32 alpha;
};

struct CRenderable {
    static RolesMask componentRoles() {
        return EntityRoles::erRenderableMask();
    }

    f32 radius;
    glm::ivec4 colour;
};

struct CParticle {
    static RolesMask componentRoles() {
        return EntityRoles::erParticleMask();
    }

    explicit CParticle()
    : radius(0.0f), alpha(0.0f), d(0.0f)
    {}

    void set(glm::ivec4 colour, f32 radius, f32 duration) {
        this->colour = colour;
        this->radius = radius;
        this->alpha = colour.a;
        this->d = colour.a/duration;
    }

    glm::ivec4 colour;
    f32 radius;
    f32 alpha;
    f32 d;
};

struct CCollidable {
    static RolesMask componentRoles() {
        return EntityRoles::erCollidableMask();
    }

    f32 radius;
};


class MyEntity : public EntityDef<CCollidable, CBody, CRenderable> {
public:

};

class Particle : public EntityDef<CParticle, CBody> {
public:

};

typedef grynca::TypesPack<MyEntity, Particle> EntityTypes;

struct CollisionEvent : public EntityEvent {
    CollisionEvent(EntityIndex te) : target_ent(te) {}

    EntityIndex target_ent;
};

class SpawnSystem : public SystemAll {
public:
    virtual const ustring getSystemName_() override { return "SpawnSystem"; }

    virtual RolesMask NeededRoles() override {
        return EntityRoles::erCollidableMask();
    }

    void init(SDL_Renderer* renderer, int count) {
        count_ = count;
        SDL_GetRendererOutputSize(renderer, &size_.x, &size_.y);
    }

    virtual void update(f32 dt, EntitiesList& entities) override {
        u32 curr_ents_cnt = getEntitiesCount();

        u32 spawn_cnt = count_ - curr_ents_cnt;
        for (u32 i=0; i<spawn_cnt; ++i) {
            Entity e = getEntityManager().newEntity(EntityTypes::pos<MyEntity>());
            CCollidable* coll = e.getData<CCollidable>();
            coll->radius = randFloat(5, 15);

            CBody* body = e.getData<CBody>();
            body->position.x = randFloat(size_.x);
            body->position.y = randFloat(size_.y);
            body->direction.x = randFloat(-50, 50);
            body->direction.y = randFloat(-50, 50);

            CRenderable* rend = e.getData<CRenderable>();
            rend->radius = coll->radius;
            rend->colour.r = u32(randFloat(128, 255));
            rend->colour.g = u32(randFloat(128, 255));
            rend->colour.b = u32(randFloat(128, 255));
            rend->colour.a = 255;
        }
    }

private:
    glm::ivec2 size_;
    int count_;
};


class BodySystem : public SystemAll {
public:
    virtual const ustring getSystemName_() override { return "BodySystem"; }

    virtual RolesMask NeededRoles() override {
        return EntityRoles::erMovableMask();
    }

    virtual void update(f32 dt, EntitiesList& entities) override {
        using FastComps = TypesPack<CBody>;
        //entities.loopEntities([dt](Entity& e) {
        entities.loopEntities<FastComps>([dt](CompsPtrs<FastComps>& comps, Entity& e) {
            //CBody* body = e.getData<CBody>();
            CBody* body = comps.accPtr<CBody>();
            body->position += body->direction * dt;
            body->rotation += body->rotationd * dt;
            body->alpha = std::min(1.0f, body->alpha + dt);
        });
    }
};

class BounceSystem : public SystemAll {
public:
    virtual const ustring getSystemName_() override { return "BounceSystem"; }

    virtual RolesMask NeededRoles() override {
        return EntityRoles::erMovableMask();
    }

    void init(SDL_Renderer* renderer) {
        SDL_GetRendererOutputSize(renderer, &size_.x, &size_.y);
    }

    virtual void update(f32 dt,EntitiesList& entities) override {
        using FastCompTypes = TypesPack<CBody>;
        entities.loopEntities<FastCompTypes>([this, dt](CompsPtrs<FastCompTypes>& comps, Entity& e) {
            CBody* body = comps.accPtr<CBody>();
            if (body->position.x < 0 || body->position.x >= size_.x)
                body->direction.x = -body->direction.x;
            if (body->position.y < 0 || body->position.y  >= size_.y)
            if (body->position.y < 0 || body->position.y  >= size_.y)
                body->direction.y = -body->direction.y;
        });
    }

private:
    glm::ivec2 size_;
};

class CollisionSystem : public SystemAll {
    static const int PARTITIONS = 200;

    struct Candidate {
        glm::vec2 position;
        float radius;
        EntityIndex entity_id;
    };

public:
    virtual const ustring getSystemName_() override { return "CollisionSystem"; }

    virtual RolesMask NeededRoles() override {
        return EntityRoles::erCollidableMask();
    }

    void init(SDL_Renderer* renderer) {
        int x, y;
        SDL_GetRendererOutputSize(renderer, &x, &y);
        size_.x = x / PARTITIONS + 1;
        size_.y = y / PARTITIONS + 1;
    }

    virtual void update(f32 dt, EntitiesList& entities) override {
        reset_();
        collect_(entities);
        collide_();
    };

private:
    void reset_() {
        grid_.clear();
        grid_.resize(size_.x * size_.y);
    }

    void collect_(EntitiesList& entities) {
        using FastCompTypes = TypesPack<CBody, CCollidable>;
        entities.loopEntities<FastCompTypes>([this](CompsPtrs<FastCompTypes>& comps, Entity& e) {
            CBody* body = comps.accPtr<CBody>();
            CCollidable* coll = comps.accPtr<CCollidable>();
            u32 left = static_cast<i32>(body->position.x - coll->radius) / PARTITIONS;
            u32 top = static_cast<i32>(body->position.y - coll->radius) / PARTITIONS;
            u32 right = static_cast<i32>(body->position.x + coll->radius) / PARTITIONS;
            u32 bottom = static_cast<i32>(body->position.y + coll->radius) / PARTITIONS;

            Candidate candidate {body->position, coll->radius, e.getIndex()};

            u32 slots[4] = {
                    u32(std::max(i32(left + top * size_.x), 0)),
                    u32(std::max(i32(right + top * size_.x), 0)),
                    u32(std::max(i32(left  + bottom * size_.x), 0)),
                    u32(std::max(i32(right + bottom * size_.x), 0))
            };

            grid_[slots[0]].push_back(candidate);
            if (left != right) grid_[slots[1]].push_back(candidate);
            if (top != bottom) {
                grid_[slots[2]].push_back(candidate);
                if (left != right)
                    grid_[slots[3]].push_back(candidate);
            }
        });
    }

    void collide_() {
        for (const fast_vector<Candidate> &candidates : grid_) {
            for (u32 i=0; i<candidates.size(); ++i) {
                for (u32 j=i+1; j<candidates.size(); ++j) {
                    const Candidate& left = candidates[i];
                    const Candidate& right = candidates[j];
                    if (collided_(left, right)) {
                        getEntityManager().getEntity(left.entity_id).emitEvent<CollisionEvent>(right.entity_id);
                    }
                }
            }
        }
    }

    float length_(const glm::vec2& v) {
        return std::sqrt(v.x * v.x + v.y * v.y);
    }

    bool collided_(const Candidate &left, const Candidate &right) {
        return !( (left.position.y+left.radius)<(right.position.y-right.radius)
               || (left.position.y-left.radius)>(right.position.y+right.radius)
               || (left.position.x-left.radius)>(right.position.x+right.radius)
               || (left.position.x+left.radius)<(right.position.x-right.radius));
    }

    glm::vec2 size_;
    fast_vector<fast_vector<Candidate>> grid_;
};

// Fade out and then remove particles.
class ParticleSystem : public SystemAll {
public:
    virtual const ustring getSystemName_() override { return "ParticleSystem"; }

    virtual RolesMask NeededRoles() override {
        return EntityRoles::erParticleMask();
    }

    virtual void update(f32 dt, EntitiesList& entities) override {
        using FastCompTypes = TypesPack<CParticle>;
        entities.loopEntities<FastCompTypes>([dt](CompsPtrs<FastCompTypes>& comps, Entity& e) {
            CParticle* particle = comps.accPtr<CParticle>();
            particle->alpha -= particle->d * dt;
            if (particle->alpha <= 0) {
                e.kill();
            }
            else {
                particle->colour.a = particle->alpha;
            }
        });
    }
};

// Renders all explosion particles efficiently as a quad vertex array.
class ParticleRenderSystem : SystemAll {
public:
    virtual const ustring getSystemName_() override { return "ParticleRenderSystem"; }

    virtual RolesMask NeededRoles() override {
        return EntityRoles::erParticleMask();
    }

    void init(SDL_Renderer* renderer) {
        renderer_ = renderer;
    }

    virtual void update(f32 dt, EntitiesList& entities) override {
        using FastCompTypes = TypesPack<CParticle, CBody>;
        entities.loopEntities<FastCompTypes>([this](CompsPtrs<FastCompTypes>& comps, Entity& e) {
            CParticle* particle = comps.accPtr<CParticle>();
            CBody* body = comps.accPtr<CBody>();

            SDL_SetRenderDrawColor(renderer_, particle->colour.r, particle->colour.g, particle->colour.b, particle->colour.a);
            SDL_Rect r{i32(body->position.x), i32(body->position.y), i32(particle->radius*2), i32(particle->radius*2) };
            SDL_RenderDrawRect(renderer_, &r);
        });
    }

private:
    SDL_Renderer* renderer_;
};

// For any two colliding bodies, destroys the bodies and emits a bunch of bodgy explosion particles.
class ExplosionSystem : public SystemScheduled {
public:
    virtual const ustring getSystemName_() override { return "ExplosionSystem"; }

    virtual RolesMask NeededRoles() override {
        return EntityRoles::erCollidableMask();
    }

    void init() {
        subscribeEvent<CollisionEvent>(this);
    }

    bool recieve(const CollisionEvent& collision) {
        scheduleEntityUpdate(collision.getEntity());
        scheduleEntityUpdate(collision.target_ent);
        return false;
    }

    virtual void update(f32 dt, EntitiesList& entities) override {
        entities.loopEntities([this](Entity& e) {
            emitParticles_(e);
            e.kill();
        });
    }

    void emitParticles_(Entity& e) {
        CBody* body = e.getData<CBody>();
        CRenderable* rend = e.getData<CRenderable>();
        CCollidable* coll = e.getData<CCollidable>();

        glm::ivec4 clr = rend->colour;
        clr.a = 200;

        f32 area = f32(PI * coll->radius * coll->radius) / 5.0f;
        for (int i = 0; i < area; i++) {
            Entity pent = getEntityManager().newEntity(EntityTypes::pos<Particle>());
            f32 rotationd = randFloat(180, 900);
            if (std::rand() % 2 == 0) rotationd = -rotationd;

            float offset = randFloat(1, coll->radius+1);
            float angle = randFloat(360) * PI / 180.0f;
            CBody* pbody = pent.getData<CBody>();
            f32 sinr = sinf(angle);
            f32 cosr = cosf(angle);
            pbody->position = body->position + glm::vec2(offset * cosr, offset * sinr);
            pbody->direction = body->direction + glm::vec2(offset * 2 * cosr, offset * 2 * sinr);
            pbody->rotationd = rotationd;

            float radius = randFloat(1, 4);

            CParticle* part = pent.getData<CParticle>();
            part->set(clr, radius, radius/2);
        }
    }
};

// Render all Renderable entities and draw some informational text.
class RenderSystem  : public SystemAll {
public:
    virtual const ustring getSystemName_() override { return "RenderSystem"; }

    virtual RolesMask NeededRoles() override {
        return EntityRoles::erRenderableMask();
    }

    void init(SDL_Renderer* renderer) {
        renderer_ = renderer;
        SDL_GetRendererOutputSize(renderer, &size_.x, &size_.y);
    }

    virtual void update(f32 dt, EntitiesList& entities) override {
        using FastCompTypes = TypesPack<CBody, CRenderable>;
        entities.loopEntities<FastCompTypes>([this](CompsPtrs<FastCompTypes>& comps, Entity& e) {
            CBody* body = comps.accPtr<CBody>();
            CRenderable* rend = comps.accPtr<CRenderable>();

            glm::ivec4 clr = rend->colour;
            clr.a = u32(body->alpha * 255);

            SDL_Rect rect{i32(body->position.x - rend->radius), i32(body->position.y - rend->radius), i32(rend->radius*2), i32(rend->radius*2)};
            SDL_SetRenderDrawColor(renderer_, clr.r, clr.g, clr.b, clr.a);
            SDL_RenderFillRect(renderer_, &rect);
        });

        u32 ents_cnt = 0;
        for (u32 i=0; i<EntityTypes::getTypesCount(); ++i) {
            ents_cnt += getEntityManager().getEntitiesPool(i).getOccupiedSize();
        }

        f32 ents_lists_memory = 0.0f;
        for (u32 i=0; i<SYSENT_PIPELINES_CNT; ++i) {
            u32 pl_size = getEntityManager().getSystemsPipelineSize(i);
            for (u32 j=0; j<pl_size; ++j) {
                SystemBase* s = getEntityManager().getSystem({i, j});
                ents_lists_memory += s->calcEntsListMemoryUsage();
            }
        }
        ents_lists_memory /= (1024*1024);

        F8x8::SDL2Text info_lbl(renderer_, ssu::formatA("entities: %u\nent_lists_mem: %.3fMB", ents_cnt, ents_lists_memory) );
        info_lbl.setColor(255, 255, 255, 255);
        info_lbl.draw(size_.x - 5 - info_lbl.getWidth(), 5);
    }

private:
    SDL_Renderer* renderer_;
    glm::ivec2 size_;
};

class EntxExampleFixture : public SDLTest {
public:
    EntityManager* em;
    i32 ents_cnt;

    ~EntxExampleFixture() {
        if (em)
            delete em;
    }

    void init(Config::ConfigSectionMap& cfg) {
        ents_cnt = loadCfgValue(cfg, "boxes_cnt", 200);


        SDLTestBench& tb = SDLTestBenchSton::get();
        em = new EntityManager();
        em->addEntityTypes<EntityTypes>(ents_cnt);

        em->addSystem<SpawnSystem>(0).init(tb.getRenderer(), ents_cnt);
        em->addSystem<BodySystem>(0);
        em->addSystem<BounceSystem>(0).init(tb.getRenderer());
        em->addSystem<CollisionSystem>(0).init(tb.getRenderer());
        em->addSystem<ExplosionSystem>(0).init();
        em->addSystem<ParticleSystem>(0);
        em->addSystem<RenderSystem>(0).init(tb.getRenderer());
        em->addSystem<ParticleRenderSystem>(0).init(tb.getRenderer());

        std::cout << em->getTypesDebugString() << std::endl;
    }

    void close() {
        delete em;
        em = NULL;
    }

    void handleEvent(SDL_Event& evt) {
        //MEASURE_BLOCK("Handle Event");
    }

    void update(SDL_Renderer* r, f32 dt) {
        SDL_SetRenderDrawColor(r, 0, 0, 0, 255);
        SDL_RenderClear(r);
        em->updateSystemsPipeline(0, dt);
    }
};


#endif //SYSENT_ENTX_EXAMPLE_H
