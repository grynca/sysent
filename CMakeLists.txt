cmake_minimum_required(VERSION 3.2)
project(sysent)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11 -std=gnu++0x" )
# for profiling
#set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g -fno-omit-frame-pointer -gdwarf-2" )

include_directories(/home/grynca/DEV/gamedev/base/src)
include_directories(include/)
include_directories(test/)

set(SOURCE_FILES
        include/sysent/SystemManager.h
        include/sysent/SystemManager.inl
        include/sysent/Entity.h
        include/sysent/EntityManager.h
        include/sysent/SystemManager_internal.h
        include/sysent/RolesMask.h
        include/sysent.h

        test/main.cpp
        test/entities.h
)
add_executable(sysent ${SOURCE_FILES})