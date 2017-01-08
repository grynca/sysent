#ifndef SYSENT_CONFIG_H
#define SYSENT_CONFIG_H

#ifndef SYSENT_MAX_FLAGS
#   define SYSENT_MAX_FLAGS 32
#endif
#ifndef SYSENT_MAX_FLAGS_LONG
#   define SYSENT_MAX_FLAGS_LONG 64
#endif
#ifndef SYSENT_MAX_ROLES
#   define SYSENT_MAX_ROLES 32
#endif
#ifndef SYSENT_PIPELINES_CNT
#   define SYSENT_PIPELINES_CNT 1
#endif
#ifndef SYSENT_MAX_ENTITY_COMPS
#   define SYSENT_MAX_ENTITY_COMPS 32
#endif
#ifndef SYSENT_MAX_COMPONENT_SIZE
#   define SYSENT_MAX_COMPONENT_SIZE 64       // must fit to cache line
#endif

#endif //SYSENT_CONFIG_H
