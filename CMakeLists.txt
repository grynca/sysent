cmake_minimum_required(VERSION 3.2)
project(sysent)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11 -std=gnu++0x" )
# for profiling
#set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g -fno-omit-frame-pointer -gdwarf-2" )

include_directories(c:/DEV/gamedev/Base/src/)

set(SOURCE_FILES main.cpp src/types/System.h src/types/SystemManager.h src/types/Entity.h src/types/EntityManager.h src/setup/entity_roles.h src/setup/entities.h src/types/SystemManager_internal.h src/setup/entity_types.h src/setup/systems.h src/setup/system_types.h src/setup/entity_props.h src/sysent.h)
add_executable(sysent ${SOURCE_FILES})