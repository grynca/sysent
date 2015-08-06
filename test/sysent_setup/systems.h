#ifndef SYSTEMS_H
#define SYSTEMS_H

#define SYSTEM_TYPES() MovementSystem

class MovementSystem : public grynca::System
{
public:
    struct UpdatePos {
        template <typename T>
        static void f(T& t, double dt) {
            t.position += t.speed*dt;
        }
    };

    template <typename T>
    void update(grynca::Entity& e, T& t, double dt) {
        grynca::Call<UpdatePos>::ifTrue<grynca::HasProps<T, grynca::props::has_speed, grynca::props::has_position> > (t, dt);
    }

    virtual grynca::RolesMask getNeededRoles() {
        return {grynca::erMovable};
    }

};


#endif //SYSTEMS_H
