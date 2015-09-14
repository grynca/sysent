#ifndef ENTITIES_H
#define ENTITIES_H

#define ENTITY_TYPES() Orc, Rock

class Movable {
public:
    //friend class MovementSystem;

    virtual void move(float dt) = 0;
};

class Orc : public Movable {
public:
    float position;
    float speed;
private:
    virtual void move(float dt) override {
        position += speed*dt;
    }
};

class Rock {
public:
    float position;
};

#endif //ENTITIES_H
