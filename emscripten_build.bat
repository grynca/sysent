mkdir build
cd build
mkdir Emscripten
cd ..
set EMCC_DEBUG=2
emcc test/main.cpp -O2 -std=c++11 -DWEB -Isrc -Itest -Ic:/DEV/gamedev/base/src -s TOTAL_MEMORY=67108864 -o build/Emscripten/main.html
