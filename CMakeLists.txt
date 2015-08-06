cmake_minimum_required(VERSION 3.2)
project(sysent)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11 -std=gnu++0x" )
# for profiling
#set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g -fno-omit-frame-pointer -gdwarf-2" )

include_directories(c:/DEV/gamedev/Base/src/)
include_directories(src/)
include_directories(test/)

set(SOURCE_FILES
 test/main.cpp
 src/sysent/types/System.h
 src/sysent/types/SystemManager.h
 src/sysent/types/SystemManager.inl
 src/sysent/types/Entity.h
 src/sysent/types/EntityManager.h
 src/sysent/types/SystemManager_internal.h
 src/sysent/types/RolesMask.h
 src/sysent.h
 src/sysent/sysent_setup.h
 src/sysent/defs.h
 )
add_executable(sysent ${SOURCE_FILES})