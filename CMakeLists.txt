cmake_minimum_required(VERSION 3.2)
project(sysent)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11 -std=gnu++0x -Wno-invalid-offsetof" )
IF (WIN32)
    # for profiling
    #set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g -fno-omit-frame-pointer -gdwarf-2" )
    include_directories(c:/DEV/gamedev/base/src/)
ELSE()
    include_directories(/home/grynca/DEV/gamedev/base/src)
ENDIF()

include_directories(include/)
include_directories(test/)

set(SOURCE_FILES
        include/sysent/Entity.h
        include/sysent/Entity.inl
        include/sysent/EntityManager.h
        include/sysent/EntityManager.inl
        include/sysent/SystemBase.h
        include/sysent/SystemBase.inl
        include/sysent/Mask.h
        include/sysent.h

        test/main.cpp
        test/entities.h
        include/sysent/EntityIndex.h
        include/sysent/EntityTypeInfo.h
        include/sysent/EntityTypeInfo.inl
        )
add_executable(sysent ${SOURCE_FILES})