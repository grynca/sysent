#undef NPROFILE     // always profile

#include "base.h"
using namespace grynca;
#include "entx_example.h"

int main(int argc, char* argv[]) {
    std::srand(std::time(0));

    SDLTestBenchSton::create(1024, 768, true);
    SDLTestBench& testbench = SDLTestBenchSton::get();


    std::string name = "EntityX example";
    EntxExampleFixture f;
    testbench.addTest(name, &f);
    std::stringstream ss;
    ss << "boxes_cnt = 150" << std::endl;
    ss >> testbench.accLastTestConfig();

    testbench.runTest(0);

    return 0;
}