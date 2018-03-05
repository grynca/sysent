@echo off
set mydir=%cd% 
if not defined EMSDK (
    cd c:\DEV\ENV\emscripten\
    call emsdk activate latest
)
cd %mydir%
mkdir build
cd build
mkdir Emscripten
cd ..
set EMCC_DEBUG=2

set IDIRS= -Itest -Iinclude -Ic:/DEV/gamedev/base/include -Ic:/DEV/ENV/msys64/mingw64/include
set FLAGS= -std=c++14 -DUSE_SDL2 -DNDEBUG -DWEB -DGLM_FORCE_RADIANS -DGLM_PRECISION_MEDIUMP_FLOAT %IDIRS% -s USE_SDL=2 -s USE_SDL_IMAGE=2 -s USE_LIBPNG=1 -s TOTAL_MEMORY=134217728 -O3 --use-preload-plugins --preload-file data

set SOURCES= test/main.cpp

call emcc %SOURCES% %FLAGS% -o build/Emscripten/main.bc
call emcc build/Emscripten/main.bc %FLAGS% -o build/Emscripten/main.html