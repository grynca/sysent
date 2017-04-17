cmake_minimum_required(VERSION 3.2)
project(sysent)

set(CMAKE_VERBOSE_MAKEFILE ON)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++14 -ffast-math" )

IF (CMAKE_BUILD_TYPE STREQUAL "Release")
    #disable profiling
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -DNPROFILE -Wall -Werror -Wno-strict-aliasing" )
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

option(USE_SDL2 "Use SDL2" ON)
IF (USE_SDL2)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -DUSE_SDL2=1" )
    IF (WIN32)
        # TODO:
    ELSE()
        set(LIBS "-lGLEW -lGL -lGLU -lSDL2")
    ENDIF()
ENDIF()

include_directories(include/)
include_directories(test/)

set(SOURCE_FILES
        include/sysent/Entity.h
        include/sysent/Entity.inl
        include/sysent/EntityTypeCtx.h
        include/sysent/EntityManager.h
        include/sysent/EntityManager.inl
        include/sysent/EntitiesList.h
        include/sysent/EntitiesList.inl
        include/sysent/RolesComposition.h
        include/sysent/RolesComposition.inl
        include/sysent/SystemAll.h
        include/sysent/System.inl
        include/sysent/SystemPipeline.h
        include/sysent/Masks.h
        include/sysent/SystemPos.h
        include/sysent/EntityIndex.h
        include/sysent/EntityTypeInfo.h
        include/sysent/EntityTypeInfo.inl
        include/sysent/sysent_config.h
        include/sysent.h

        test/main.cpp
        test/entx_example.h)
add_executable(sysent ${SOURCE_FILES})
target_link_libraries(sysent ${LIBS})