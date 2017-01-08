cmake_minimum_required(VERSION 3.2)
project(sysent)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++14 -ffast-math -Wall -Werror" )

IF (CMAKE_BUILD_TYPE STREQUAL "Release")
    #disable profiling
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -DNPROFILE" )
ENDIF()

IF (CMAKE_BUILD_TYPE STREQUAL "RelWithDebInfo")
    IF (WIN32)
        # for profiling
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fno-omit-frame-pointer -gdwarf-2" )
    ENDIF()
ENDIF()

IF (WIN32)
    include_directories(c:/DEV/gamedev/base/include/)
ELSE()
    include_directories(/home/grynca/DEV/gamedev/base/include)
ENDIF()

include_directories(include/)
include_directories(test/)

set(SOURCE_FILES
        include/sysent/Entity.h
        include/sysent/Entity.inl
        include/sysent/EntityManager.h
        include/sysent/EntityManager.inl
        include/sysent/System.h
        include/sysent/System.inl
        include/sysent/FlaggedSystem.h
        include/sysent/FlaggedSystem.inl
        include/sysent/Masks.h
        include/sysent.h

        test/main.cpp
        test/entities.h
        include/sysent/EntityIndex.h
        include/sysent/EntityTypeInfo.h
        include/sysent/EntityTypeInfo.inl
        include/sysent/sysent_config.h)
add_executable(sysent ${SOURCE_FILES})