cmake_minimum_required(VERSION 3.2)
project(sysent)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11 -std=gnu++0x" )
# for profiling
#set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g -fno-omit-frame-pointer -gdwarf-2" )

include_directories(c:/DEV/gamedev/Base/src/)
include_directories(src/)
include_directories(test/)

set(SOURCE_FILES test/main.cpp src/types/System.h src/types/SystemManager.h src/types/Entity.h src/types/EntityManager.h test/setup/entity_roles.h test/setup/entities.h src/types/SystemManager_internal.h test/setup/entity_types.h test/setup/systems.h test/setup/system_types.h test/setup/entity_props.h src/sysent.h)
add_executable(sysent ${SOURCE_FILES})