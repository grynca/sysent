mkdir build
cd build
mkdir Emscripten
cd ..
set EMCC_DEBUG=2
emcc test/main.cpp -O3 -std=c++11 -DWEB -Isrc -Itest -Ic:/DEV/gamedev/base/src -s USE_SDL=2 TOTAL_MEMORY=67108864 -o build/Emscripten/main.html
