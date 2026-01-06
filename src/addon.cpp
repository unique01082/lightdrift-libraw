#include <napi.h>
#include "libraw_wrapper.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    return LibRawWrapper::Init(env, exports);
}

// Use context-aware initialization for worker thread safety
NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)
