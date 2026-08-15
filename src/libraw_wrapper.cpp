#include "libraw_wrapper.h"
#include <iostream>
#include <sstream>
#include <vector>
#include <climits>
#include <limits>
#include <cstdio>
#include <cstring>
#if defined(_MSC_VER)
#include <intrin.h>
#endif

namespace {
#if defined(_WIN32)
std::wstring WideString(const Napi::Value& value) {
    const std::u16string utf16 = value.As<Napi::String>().Utf16Value();
    return std::wstring(utf16.begin(), utf16.end());
}
#endif

bool CancellationRequested(volatile int32_t* flag) {
    if (!flag) return false;
#if defined(_MSC_VER)
    return _InterlockedCompareExchange(
        reinterpret_cast<volatile long*>(const_cast<int32_t*>(flag)), 0, 0) != 0;
#else
    return __atomic_load_n(flag, __ATOMIC_SEQ_CST) != 0;
#endif
}
}

Napi::Object LibRawWrapper::Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);

    Napi::Function func = DefineClass(env, "LibRawWrapper", {
        // File Operations
        InstanceMethod("openFile", &LibRawWrapper::OpenFile),
        InstanceMethod("openBuffer", &LibRawWrapper::OpenBuffer),
        InstanceMethod("openBayer", &LibRawWrapper::OpenBayer),
        InstanceMethod("loadFile", &LibRawWrapper::LoadFile),
        InstanceMethod("loadBuffer", &LibRawWrapper::LoadBuffer),
        InstanceMethod("loadBayerData", &LibRawWrapper::LoadBayerData),
        InstanceMethod("close", &LibRawWrapper::Close),
        InstanceMethod("recycle", &LibRawWrapper::Recycle),
        InstanceMethod("recycleDatastream", &LibRawWrapper::RecycleDatastream),
        InstanceMethod("drainEvents", &LibRawWrapper::DrainEvents),
        InstanceMethod("setCancellationBuffer", &LibRawWrapper::SetCancellationBuffer),
        
        // Error Handling
        InstanceMethod("getLastError", &LibRawWrapper::GetLastError),
        InstanceMethod("strerror", &LibRawWrapper::Strerror),
        
        // Metadata & Information
        InstanceMethod("getMetadata", &LibRawWrapper::GetMetadata),
        InstanceMethod("getImageSize", &LibRawWrapper::GetImageSize),
        InstanceMethod("getAdvancedMetadata", &LibRawWrapper::GetAdvancedMetadata),
        InstanceMethod("getLensInfo", &LibRawWrapper::GetLensInfo),
        InstanceMethod("getColorInfo", &LibRawWrapper::GetColorInfo),
        InstanceMethod("getRawImageBuffer", &LibRawWrapper::GetRawImageBuffer),
        
        // Image Processing
        InstanceMethod("unpackThumbnail", &LibRawWrapper::UnpackThumbnail),
        InstanceMethod("unpackThumbEx", &LibRawWrapper::UnpackThumbnailEx),
        InstanceMethod("processImage", &LibRawWrapper::ProcessImage),
        InstanceMethod("subtractBlack", &LibRawWrapper::SubtractBlack),
        InstanceMethod("subtractBlackInternal", &LibRawWrapper::SubtractBlackInternal),
        InstanceMethod("raw2Image", &LibRawWrapper::Raw2Image),
        InstanceMethod("raw2ImageStart", &LibRawWrapper::Raw2ImageStart),
        InstanceMethod("adjustMaximum", &LibRawWrapper::AdjustMaximum),
        InstanceMethod("adjustToRawInsetCrop", &LibRawWrapper::AdjustToRawInsetCrop),
        InstanceMethod("setMakeFromIndex", &LibRawWrapper::SetMakeFromIndex),
        
        // Memory Image Creation
        InstanceMethod("createMemoryImage", &LibRawWrapper::CreateMemoryImage),
        InstanceMethod("createMemoryThumbnail", &LibRawWrapper::CreateMemoryThumbnail),
        
        // File Writers
        InstanceMethod("writePPM", &LibRawWrapper::WritePPM),
        InstanceMethod("writeTIFF", &LibRawWrapper::WriteTIFF),
        InstanceMethod("writeThumbnail", &LibRawWrapper::WriteThumbnail),
        
        // Configuration & Settings
        InstanceMethod("setOutputParams", &LibRawWrapper::SetOutputParams),
        InstanceMethod("getOutputParams", &LibRawWrapper::GetOutputParams),
        
        // Utility Functions
        InstanceMethod("isFloatingPoint", &LibRawWrapper::IsFloatingPoint),
        InstanceMethod("isFujiRotated", &LibRawWrapper::IsFujiRotated),
        InstanceMethod("isSRAW", &LibRawWrapper::IsSRAW),
        InstanceMethod("isJPEGThumb", &LibRawWrapper::IsJPEGThumb),
        InstanceMethod("errorCount", &LibRawWrapper::ErrorCount),
        
        // Extended Utility Functions
        InstanceMethod("isNikonSRAW", &LibRawWrapper::IsNikonSRAW),
        InstanceMethod("isCoolscanNEF", &LibRawWrapper::IsCoolscanNEF),
        InstanceMethod("haveFPData", &LibRawWrapper::HaveFPData),
        InstanceMethod("srawMidpoint", &LibRawWrapper::SrawMidpoint),
        InstanceMethod("thumbOK", &LibRawWrapper::ThumbOK),
        InstanceMethod("unpackFunctionName", &LibRawWrapper::UnpackFunctionName),
        InstanceMethod("getDecoderInfo", &LibRawWrapper::GetDecoderInfo),
        
        // Advanced Processing
        InstanceMethod("unpack", &LibRawWrapper::Unpack),
        InstanceMethod("raw2ImageEx", &LibRawWrapper::Raw2ImageEx),
        InstanceMethod("adjustSizesInfoOnly", &LibRawWrapper::AdjustSizesInfoOnly),
        InstanceMethod("freeImage", &LibRawWrapper::FreeImage),
        InstanceMethod("convertFloatToInt", &LibRawWrapper::ConvertFloatToInt),
        
        // Memory Operations Extended
        InstanceMethod("getMemImageFormat", &LibRawWrapper::GetMemImageFormat),
        InstanceMethod("copyMemImage", &LibRawWrapper::CopyMemImage),
        
        // Color Operations
        InstanceMethod("getColorAt", &LibRawWrapper::GetColorAt),
        InstanceMethod("filterColorAt", &LibRawWrapper::GetFilterColorAt),
        InstanceMethod("fcol", &LibRawWrapper::GetFcol),

        InstanceMethod("phaseOneSubtractBlack", &LibRawWrapper::PhaseOneSubtractBlack),
        InstanceMethod("phaseOneCorrect", &LibRawWrapper::PhaseOneCorrect),
        InstanceMethod("setRawSpeedCameraFile", &LibRawWrapper::SetRawSpeedCameraFile),
        InstanceMethod("adobeCoeff", &LibRawWrapper::AdobeCoeff),
        
        // Cancellation Support
        InstanceMethod("setCancelFlag", &LibRawWrapper::SetCancelFlag),
        InstanceMethod("clearCancelFlag", &LibRawWrapper::ClearCancelFlag),
        
        // Version Information (Instance Methods)
        InstanceMethod("version", &LibRawWrapper::Version),
        InstanceMethod("versionNumber", &LibRawWrapper::VersionNumber),
        
        // Static Methods
        StaticMethod("getVersion", &LibRawWrapper::GetVersion),
        StaticMethod("getCapabilities", &LibRawWrapper::GetCapabilities),
        StaticMethod("getCameraList", &LibRawWrapper::GetCameraList),
        StaticMethod("getCameraCount", &LibRawWrapper::GetCameraCount),
        StaticMethod("cameraMakerIndexToMaker", &LibRawWrapper::CameraMakerIndexToMaker),
        StaticMethod("simplifyMakeModel", &LibRawWrapper::SimplifyMakeModel),
        StaticMethod("strProgress", &LibRawWrapper::StrProgress)
    });

    exports.Set("LibRawWrapper", func);
    return exports;
}

LibRawWrapper::LibRawWrapper(const Napi::CallbackInfo& info) 
    : Napi::ObjectWrap<LibRawWrapper>(info), isLoaded(false), isUnpacked(false), isProcessed(false) {
    Napi::Env env = info.Env();
    Napi::HandleScope scope(env);

    try {
        unsigned int flags = 0;
        if (info.Length() > 0 && info[0].IsNumber()) {
            flags = info[0].As<Napi::Number>().Uint32Value();
        }
        processor = std::make_unique<LibRaw>(flags);
        processor->set_progress_handler(&LibRawWrapper::ProgressCallback, this);
        processor->set_dataerror_handler(&LibRawWrapper::DataErrorCallback, this);
        processor->set_exifparser_handler(&LibRawWrapper::ExifTagCallback, this);
        processor->set_makernotes_handler(&LibRawWrapper::MakerNoteCallback, this);
    } catch (const std::exception& e) {
        std::string errorMsg = "Failed to initialize LibRaw: ";
        errorMsg += e.what();
        Napi::TypeError::New(env, errorMsg).ThrowAsJavaScriptException();
    }
}

void LibRawWrapper::PushEvent(NativeEvent event) {
    std::lock_guard<std::mutex> lock(eventMutex);
    events.push_back(std::move(event));
}

int LibRawWrapper::ProgressCallback(void* context, enum LibRaw_progress stage, int iteration, int expected) {
    auto* self = static_cast<LibRawWrapper*>(context);
    self->PushEvent({NativeEventType::Progress, stage, iteration, expected, 0, ""});
    return CancellationRequested(self->cancellationFlag) ? 1 : 0;
}

void LibRawWrapper::DataErrorCallback(void* context, const char* file, const INT64 offset) {
    auto* self = static_cast<LibRawWrapper*>(context);
    self->PushEvent({NativeEventType::DataError, offset, 0, 0, 0, file ? file : ""});
}

void LibRawWrapper::ExifTagCallback(void* context, int tag, int type, int len, unsigned int order, void*, INT64) {
    auto* self = static_cast<LibRawWrapper*>(context);
    self->PushEvent({NativeEventType::ExifTag, tag, type, len, order, ""});
}

void LibRawWrapper::MakerNoteCallback(void* context, int tag, int type, int len, unsigned int order, void*, INT64) {
    auto* self = static_cast<LibRawWrapper*>(context);
    self->PushEvent({NativeEventType::MakerNote, tag, type, len, order, ""});
}

Napi::Value LibRawWrapper::DrainEvents(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    std::vector<NativeEvent> drained;
    {
        std::lock_guard<std::mutex> lock(eventMutex);
        drained.swap(events);
    }
    Napi::Array result = Napi::Array::New(env, drained.size());
    for (size_t index = 0; index < drained.size(); ++index) {
        const NativeEvent& event = drained[index];
        Napi::Object value = Napi::Object::New(env);
        if (event.type == NativeEventType::Progress) {
            value.Set("name", "progress");
            value.Set("stage", Napi::Number::New(env, event.a));
            value.Set("iteration", Napi::Number::New(env, event.b));
            value.Set("expected", Napi::Number::New(env, event.c));
        } else if (event.type == NativeEventType::DataError) {
            value.Set("name", "dataError");
            value.Set("offset", Napi::Number::New(env, static_cast<double>(event.a)));
            value.Set("file", event.message);
        } else {
            value.Set("name", event.type == NativeEventType::ExifTag ? "exifTag" : "makerNote");
            value.Set("tag", Napi::Number::New(env, event.a));
            value.Set("type", Napi::Number::New(env, event.b));
            value.Set("length", Napi::Number::New(env, event.c));
            value.Set("order", Napi::Number::New(env, event.d));
        }
        result.Set(index, value);
    }
    return result;
}

Napi::Value LibRawWrapper::SetCancellationBuffer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsTypedArray()) {
        Napi::TypeError::New(env, "Expected Int32Array cancellation buffer").ThrowAsJavaScriptException();
        return env.Null();
    }
    Napi::TypedArray array = info[0].As<Napi::TypedArray>();
    if (array.TypedArrayType() != napi_int32_array || array.ElementLength() < 1) {
        Napi::TypeError::New(env, "Expected non-empty Int32Array cancellation buffer").ThrowAsJavaScriptException();
        return env.Null();
    }
    cancellationFlag = info[0].As<Napi::Int32Array>().Data();
    return env.Undefined();
}

LibRawWrapper::~LibRawWrapper() {
    if (processor && isLoaded) {
        processor->recycle();
    }
}

bool LibRawWrapper::CheckLoaded(Napi::Env env) {
    if (!isLoaded) {
        Napi::Error::New(env, "No file loaded. Call loadFile() first.").ThrowAsJavaScriptException();
        return false;
    }
    return true;
}

// ============== FILE OPERATIONS ==============

Napi::Value LibRawWrapper::OpenFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected string filename").ThrowAsJavaScriptException();
        return env.Null();
    }

#if defined(_WIN32)
    const std::wstring filename = WideString(info[0]);
    int ret = processor->open_file(filename.c_str());
#else
    const std::string filename = info[0].As<Napi::String>().Utf8Value();
    int ret = processor->open_file(filename.c_str());
#endif
    if (ret != LIBRAW_SUCCESS) {
        Napi::Error error = Napi::Error::New(env, libraw_strerror(ret));
        error.Set("librawCode", Napi::Number::New(env, ret));
        error.ThrowAsJavaScriptException();
        return env.Null();
    }
    isLoaded = true;
    isUnpacked = false;
    isProcessed = false;
    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::OpenBuffer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsBuffer()) {
        Napi::TypeError::New(env, "Expected Buffer").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Buffer<uint8_t> input = info[0].As<Napi::Buffer<uint8_t>>();
    int ret = processor->open_buffer(input.Data(), input.Length());
    if (ret != LIBRAW_SUCCESS) {
        Napi::Error error = Napi::Error::New(env, libraw_strerror(ret));
        error.Set("librawCode", Napi::Number::New(env, ret));
        error.ThrowAsJavaScriptException();
        return env.Null();
    }
    isLoaded = true;
    isUnpacked = false;
    isProcessed = false;
    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::OpenBayer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsBuffer() || !info[1].IsObject()) {
        Napi::TypeError::New(env, "Expected Buffer and Bayer descriptor").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Buffer<uint8_t> input = info[0].As<Napi::Buffer<uint8_t>>();
    Napi::Object descriptor = info[1].As<Napi::Object>();
    auto uintValue = [&](const char* name, unsigned int fallback) {
        return descriptor.Has(name) && descriptor.Get(name).IsNumber()
            ? descriptor.Get(name).As<Napi::Number>().Uint32Value()
            : fallback;
    };
    unsigned int width = uintValue("width", 0);
    unsigned int height = uintValue("height", 0);
    if (!width || !height) {
        Napi::RangeError::New(env, "Bayer width and height must be positive").ThrowAsJavaScriptException();
        return env.Null();
    }

    int ret = processor->open_bayer(
        input.Data(), input.Length(), width, height,
        uintValue("leftMargin", 0), uintValue("topMargin", 0),
        uintValue("rightMargin", 0), uintValue("bottomMargin", 0),
        uintValue("procFlags", 0), uintValue("bayerPattern", LIBRAW_OPENBAYER_BGGR),
        uintValue("unusedBits", 0), uintValue("otherFlags", 0),
        uintValue("blackLevel", 0));
    if (ret != LIBRAW_SUCCESS) {
        Napi::Error error = Napi::Error::New(env, libraw_strerror(ret));
        error.Set("librawCode", Napi::Number::New(env, ret));
        error.ThrowAsJavaScriptException();
        return env.Null();
    }
    isLoaded = true;
    isUnpacked = false;
    isProcessed = false;
    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::LoadFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected string filename").ThrowAsJavaScriptException();
        return env.Null();
    }

    try {
#if defined(_WIN32)
        const std::wstring filename = WideString(info[0]);
        int ret = processor->open_file(filename.c_str());
#else
        const std::string filename = info[0].As<Napi::String>().Utf8Value();
        int ret = processor->open_file(filename.c_str());
#endif
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to open file: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        ret = processor->unpack();
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to unpack file: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        isLoaded = true;
        isUnpacked = true;
        isProcessed = false;
        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::LoadBayerData(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected string filename").ThrowAsJavaScriptException();
        return env.Null();
    }

    if (info.Length() != 2 || !info[1].IsObject()) {
        Napi::TypeError::New(env, "Expected width and height of file").ThrowAsJavaScriptException();
        return env.Null();   
    }

    Napi::Object fileProperty = info[1].As<Napi::Object>();

    if (!fileProperty.Has("width") || !fileProperty.Get("width").IsNumber()) {
        Napi::TypeError::New(env, "Undefined width of file").ThrowAsJavaScriptException();
        return env.Null(); 
    }

    if (!fileProperty.Has("height") || !fileProperty.Get("height").IsNumber()) {
        Napi::TypeError::New(env, "Undefined height of file").ThrowAsJavaScriptException();
        return env.Null(); 
    }

#if defined(_WIN32)
    const std::wstring filename = WideString(info[0]);
    std::unique_ptr<FILE, int(*)(FILE*)> in(_wfopen(filename.c_str(), L"rb"), fclose);
#else
    const std::string filename = info[0].As<Napi::String>().Utf8Value();
    std::unique_ptr<FILE, int(*)(FILE*)> in(fopen(filename.c_str(), "rb"), fclose);
#endif
    if (!in) {
        Napi::Error::New(env, "Failed to open Bayer file").ThrowAsJavaScriptException();
        return env.Null();
    }
    if (fseek(in.get(), 0, SEEK_END) != 0) {
        Napi::Error::New(env, "Failed to seek Bayer file").ThrowAsJavaScriptException();
        return env.Null();
    }
    const long fileSize = ftell(in.get());
    if (fileSize <= 0 || static_cast<unsigned long>(fileSize) > UINT_MAX ||
        fseek(in.get(), 0, SEEK_SET) != 0) {
        Napi::Error::New(env, "Invalid Bayer file size").ThrowAsJavaScriptException();
        return env.Null();
    }
    const unsigned fsz = static_cast<unsigned>(fileSize);

    std::vector<unsigned char> buffer(fsz);
    const size_t bytesRead = fread(buffer.data(), 1, fsz, in.get());
    in.reset();
    if (bytesRead != fsz) {
        Napi::Error::New(env, "Failed to read file").ThrowAsJavaScriptException();
        return env.Null();
    }

    processor->imgdata.params.output_tiff = 1;

    try {
        int ret = processor->open_bayer(
            buffer.data(),
            fsz, 
            fileProperty.Get("width").As<Napi::Number>().Uint32Value(), 
            fileProperty.Get("height").As<Napi::Number>().Uint32Value(), 
            0, 0, 0, 0, 0,
            LIBRAW_OPENBAYER_BGGR, 0, 0, 0);

        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to open file: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        ret = processor->unpack();
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to unpack file: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        isLoaded = true;
        isUnpacked = true;
        isProcessed = false;
        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::LoadBuffer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsBuffer()) {
        Napi::TypeError::New(env, "Expected Buffer").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();

    try {
        int ret = processor->open_buffer(buffer.Data(), buffer.Length());
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to open buffer: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        ret = processor->unpack();
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to unpack buffer: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        isLoaded = true;
        isUnpacked = true;
        isProcessed = false;
        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::Close(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (processor && isLoaded) {
        processor->recycle();
        isLoaded = false;
        isUnpacked = false;
        isProcessed = false;
    }

    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::Recycle(const Napi::CallbackInfo& info) {
    return Close(info);
}

Napi::Value LibRawWrapper::RecycleDatastream(const Napi::CallbackInfo& info) {
    processor->recycle_datastream();
    return info.Env().Undefined();
}

// ============== METADATA & INFORMATION ==============

Napi::Value LibRawWrapper::GetMetadata(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    Napi::Object metadata = Napi::Object::New(env);

    try {
        // Camera info
        if (processor->imgdata.idata.make[0]) {
            metadata.Set("make", Napi::String::New(env, processor->imgdata.idata.make));
        }
        if (processor->imgdata.idata.model[0]) {
            metadata.Set("model", Napi::String::New(env, processor->imgdata.idata.model));
        }
        if (processor->imgdata.idata.software[0]) {
            metadata.Set("software", Napi::String::New(env, processor->imgdata.idata.software));
        }

        // Image dimensions
        metadata.Set("width", Napi::Number::New(env, processor->imgdata.sizes.width));
        metadata.Set("height", Napi::Number::New(env, processor->imgdata.sizes.height));
        metadata.Set("rawWidth", Napi::Number::New(env, processor->imgdata.sizes.raw_width));
        metadata.Set("rawHeight", Napi::Number::New(env, processor->imgdata.sizes.raw_height));

        // Color info
        metadata.Set("colors", Napi::Number::New(env, processor->imgdata.idata.colors));
        metadata.Set("filters", Napi::Number::New(env, processor->imgdata.idata.filters));

        // ISO and exposure
        if (processor->imgdata.other.iso_speed > 0) {
            metadata.Set("iso", Napi::Number::New(env, processor->imgdata.other.iso_speed));
        }
        if (processor->imgdata.other.shutter > 0) {
            metadata.Set("shutterSpeed", Napi::Number::New(env, processor->imgdata.other.shutter));
        }
        if (processor->imgdata.other.aperture > 0) {
            metadata.Set("aperture", Napi::Number::New(env, processor->imgdata.other.aperture));
        }
        if (processor->imgdata.other.focal_len > 0) {
            metadata.Set("focalLength", Napi::Number::New(env, processor->imgdata.other.focal_len));
        }

        // Timestamp
        if (processor->imgdata.other.timestamp > 0) {
            metadata.Set("timestamp", Napi::Number::New(env, processor->imgdata.other.timestamp));
        }

        return metadata;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::GetImageSize(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    Napi::Object size = Napi::Object::New(env);
    size.Set("width", Napi::Number::New(env, processor->imgdata.sizes.width));
    size.Set("height", Napi::Number::New(env, processor->imgdata.sizes.height));
    size.Set("rawWidth", Napi::Number::New(env, processor->imgdata.sizes.raw_width));
    size.Set("rawHeight", Napi::Number::New(env, processor->imgdata.sizes.raw_height));
    size.Set("topMargin", Napi::Number::New(env, processor->imgdata.sizes.top_margin));
    size.Set("leftMargin", Napi::Number::New(env, processor->imgdata.sizes.left_margin));
    size.Set("iWidth", Napi::Number::New(env, processor->imgdata.sizes.iwidth));
    size.Set("iHeight", Napi::Number::New(env, processor->imgdata.sizes.iheight));

    return size;
}

Napi::Value LibRawWrapper::GetAdvancedMetadata(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    Napi::Object metadata = Napi::Object::New(env);

    try {
        // Camera details
        if (processor->imgdata.idata.normalized_make[0]) {
            metadata.Set("normalizedMake", Napi::String::New(env, processor->imgdata.idata.normalized_make));
        }
        if (processor->imgdata.idata.normalized_model[0]) {
            metadata.Set("normalizedModel", Napi::String::New(env, processor->imgdata.idata.normalized_model));
        }
        
        metadata.Set("rawCount", Napi::Number::New(env, processor->imgdata.idata.raw_count));
        metadata.Set("dngVersion", Napi::Number::New(env, processor->imgdata.idata.dng_version));
        metadata.Set("is_foveon", Napi::Number::New(env, processor->imgdata.idata.is_foveon));
        
        // Color matrix and calibration
        Napi::Array colorMatrix = Napi::Array::New(env);
        for (int i = 0; i < 4; i++) {
            Napi::Array row = Napi::Array::New(env);
            for (int j = 0; j < 3; j++) {
                row.Set(j, Napi::Number::New(env, processor->imgdata.color.cmatrix[i][j]));
            }
            colorMatrix.Set(i, row);
        }
        metadata.Set("colorMatrix", colorMatrix);

        // White balance
        Napi::Array camMul = Napi::Array::New(env);
        for (int i = 0; i < 4; i++) {
            camMul.Set(i, Napi::Number::New(env, processor->imgdata.color.cam_mul[i]));
        }
        metadata.Set("camMul", camMul);

        Napi::Array preMul = Napi::Array::New(env);
        for (int i = 0; i < 4; i++) {
            preMul.Set(i, Napi::Number::New(env, processor->imgdata.color.pre_mul[i]));
        }
        metadata.Set("preMul", preMul);

        // Additional sensor info
        metadata.Set("blackLevel", Napi::Number::New(env, processor->imgdata.color.black));
        metadata.Set("dataMaximum", Napi::Number::New(env, processor->imgdata.color.data_maximum));
        metadata.Set("whiteLevel", Napi::Number::New(env, processor->imgdata.color.maximum));

        return metadata;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::GetLensInfo(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    Napi::Object lensInfo = Napi::Object::New(env);

    try {
        if (processor->imgdata.lens.Lens[0]) {
            lensInfo.Set("lensName", Napi::String::New(env, processor->imgdata.lens.Lens));
        }
        if (processor->imgdata.lens.LensMake[0]) {
            lensInfo.Set("lensMake", Napi::String::New(env, processor->imgdata.lens.LensMake));
        }
        if (processor->imgdata.lens.LensSerial[0]) {
            lensInfo.Set("lensSerial", Napi::String::New(env, processor->imgdata.lens.LensSerial));
        }
        if (processor->imgdata.lens.InternalLensSerial[0]) {
            lensInfo.Set("internalLensSerial", Napi::String::New(env, processor->imgdata.lens.InternalLensSerial));
        }
        
        // Focal length info
        if (processor->imgdata.lens.MinFocal > 0) {
            lensInfo.Set("minFocal", Napi::Number::New(env, processor->imgdata.lens.MinFocal));
        }
        if (processor->imgdata.lens.MaxFocal > 0) {
            lensInfo.Set("maxFocal", Napi::Number::New(env, processor->imgdata.lens.MaxFocal));
        }
        if (processor->imgdata.lens.MaxAp4MinFocal > 0) {
            lensInfo.Set("maxAp4MinFocal", Napi::Number::New(env, processor->imgdata.lens.MaxAp4MinFocal));
        }
        if (processor->imgdata.lens.MaxAp4MaxFocal > 0) {
            lensInfo.Set("maxAp4MaxFocal", Napi::Number::New(env, processor->imgdata.lens.MaxAp4MaxFocal));
        }
        if (processor->imgdata.lens.EXIF_MaxAp > 0) {
            lensInfo.Set("exifMaxAp", Napi::Number::New(env, processor->imgdata.lens.EXIF_MaxAp));
        }
        if (processor->imgdata.lens.FocalLengthIn35mmFormat > 0) {
            lensInfo.Set("focalLengthIn35mmFormat", Napi::Number::New(env, processor->imgdata.lens.FocalLengthIn35mmFormat));
        }

        return lensInfo;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::GetColorInfo(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    Napi::Object colorInfo = Napi::Object::New(env);

    try {
        // Basic color info
        colorInfo.Set("colors", Napi::Number::New(env, processor->imgdata.idata.colors));
        colorInfo.Set("filters", Napi::Number::New(env, processor->imgdata.idata.filters));
        
        // Color data
        colorInfo.Set("blackLevel", Napi::Number::New(env, processor->imgdata.color.black));
        colorInfo.Set("dataMaximum", Napi::Number::New(env, processor->imgdata.color.data_maximum));
        colorInfo.Set("whiteLevel", Napi::Number::New(env, processor->imgdata.color.maximum));
        
        // Color profile
        if (processor->imgdata.color.profile_length > 0) {
            colorInfo.Set("profileLength", Napi::Number::New(env, processor->imgdata.color.profile_length));
        }
        
        // Color matrices
        Napi::Array rgbCam = Napi::Array::New(env);
        for (int i = 0; i < 3; i++) {
            Napi::Array row = Napi::Array::New(env);
            for (int j = 0; j < 4; j++) {
                row.Set(j, Napi::Number::New(env, processor->imgdata.color.rgb_cam[i][j]));
            }
            rgbCam.Set(i, row);
        }
        colorInfo.Set("rgbCam", rgbCam);

        // Camera multipliers
        Napi::Array camMul = Napi::Array::New(env);
        for (int i = 0; i < 4; i++) {
            camMul.Set(i, Napi::Number::New(env, processor->imgdata.color.cam_mul[i]));
        }
        colorInfo.Set("camMul", camMul);

        return colorInfo;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// ============== IMAGE PROCESSING ==============

Napi::Value LibRawWrapper::GetRawImageBuffer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    const size_t pixels = static_cast<size_t>(processor->imgdata.rawdata.sizes.raw_width) *
                          processor->imgdata.rawdata.sizes.raw_height;
    if (processor->imgdata.rawdata.raw_image) {
        return Napi::Buffer<uint8_t>::Copy(
            env,
            reinterpret_cast<uint8_t*>(processor->imgdata.rawdata.raw_image),
            pixels * sizeof(ushort));
    }
    if (processor->imgdata.rawdata.color4_image) {
        return Napi::Buffer<uint8_t>::Copy(
            env,
            reinterpret_cast<uint8_t*>(processor->imgdata.rawdata.color4_image),
            pixels * 4 * sizeof(ushort));
    }
    if (processor->imgdata.rawdata.color3_image) {
        return Napi::Buffer<uint8_t>::Copy(
            env,
            reinterpret_cast<uint8_t*>(processor->imgdata.rawdata.color3_image),
            pixels * 3 * sizeof(ushort));
    }
    if (processor->imgdata.image) {
        const size_t imagePixels = static_cast<size_t>(processor->imgdata.sizes.iwidth) *
                                   processor->imgdata.sizes.iheight;
        return Napi::Buffer<uint8_t>::Copy(
            env,
            reinterpret_cast<uint8_t*>(processor->imgdata.image),
            imagePixels * 4 * sizeof(ushort));
    }
    Napi::Error::New(env, "No decoded pixel buffer is available").ThrowAsJavaScriptException();
    return env.Null();
}

Napi::Value LibRawWrapper::UnpackThumbnail(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    try {
        int ret = processor->unpack_thumb();
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to unpack thumbnail: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::UnpackThumbnailEx(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Expected thumbnail index").ThrowAsJavaScriptException();
        return env.Null();
    }
    int ret = processor->unpack_thumb_ex(info[0].As<Napi::Number>().Int32Value());
    if (ret != LIBRAW_SUCCESS) {
        Napi::Error error = Napi::Error::New(env, libraw_strerror(ret));
        error.Set("librawCode", Napi::Number::New(env, ret));
        error.ThrowAsJavaScriptException();
        return env.Null();
    }
    return env.Undefined();
}

Napi::Value LibRawWrapper::ProcessImage(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    try {
        int ret = processor->dcraw_process();
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to process image: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        isProcessed = true;
        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::SubtractBlack(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    try {
        int ret = processor->subtract_black();
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to subtract black: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::SubtractBlackInternal(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();
    int ret = processor->subtract_black_internal();
    if (ret != LIBRAW_SUCCESS) {
        Napi::Error error = Napi::Error::New(env, libraw_strerror(ret));
        error.Set("librawCode", Napi::Number::New(env, ret));
        error.ThrowAsJavaScriptException();
        return env.Null();
    }
    return env.Undefined();
}

Napi::Value LibRawWrapper::Raw2Image(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    try {
        int ret = processor->raw2image();
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to convert raw to image: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::Raw2ImageStart(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();
    processor->raw2image_start();
    return env.Undefined();
}

Napi::Value LibRawWrapper::AdjustMaximum(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    try {
        int ret = processor->adjust_maximum();
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to adjust maximum: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::AdjustToRawInsetCrop(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Expected crop mask").ThrowAsJavaScriptException();
        return env.Null();
    }
    unsigned int mask = info[0].As<Napi::Number>().Uint32Value();
    float maxCrop = info.Length() > 1 && info[1].IsNumber()
        ? info[1].As<Napi::Number>().FloatValue()
        : 0.55f;
    int ret = processor->adjust_to_raw_inset_crop(mask, maxCrop);
    if (ret != LIBRAW_SUCCESS) {
        Napi::Error error = Napi::Error::New(env, libraw_strerror(ret));
        error.Set("librawCode", Napi::Number::New(env, ret));
        error.ThrowAsJavaScriptException();
        return env.Null();
    }
    return env.Undefined();
}

Napi::Value LibRawWrapper::SetMakeFromIndex(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Expected camera maker index").ThrowAsJavaScriptException();
        return env.Null();
    }
    int ret = processor->setMakeFromIndex(info[0].As<Napi::Number>().Uint32Value());
    if (ret != LIBRAW_SUCCESS) {
        Napi::Error error = Napi::Error::New(env, libraw_strerror(ret));
        error.Set("librawCode", Napi::Number::New(env, ret));
        error.ThrowAsJavaScriptException();
        return env.Null();
    }
    return env.Undefined();
}

// ============== MEMORY IMAGE CREATION ==============

Napi::Object LibRawWrapper::CreateImageDataObject(Napi::Env env, libraw_processed_image_t* img) {
    Napi::Object result = Napi::Object::New(env);
    
    if (!img) {
        return result;
    }

    result.Set("type", Napi::Number::New(env, img->type));
    result.Set("height", Napi::Number::New(env, img->height));
    result.Set("width", Napi::Number::New(env, img->width));
    result.Set("colors", Napi::Number::New(env, img->colors));
    result.Set("bits", Napi::Number::New(env, img->bits));
    result.Set("dataSize", Napi::Number::New(env, img->data_size));
    
    // Create buffer with the image data
    Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(env, img->data, img->data_size);
    result.Set("data", buffer);

    return result;
}

Napi::Value LibRawWrapper::CreateMemoryImage(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    try {
        int errcode = 0;
        libraw_processed_image_t* img = processor->dcraw_make_mem_image(&errcode);
        
        if (!img || errcode != LIBRAW_SUCCESS) {
            std::string error = "Failed to create memory image: ";
            if (errcode != LIBRAW_SUCCESS) {
                error += libraw_strerror(errcode);
            } else {
                error += "Unknown error";
            }
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        std::unique_ptr<libraw_processed_image_t, void (*)(libraw_processed_image_t*)>
            ownedImage(img, &LibRaw::dcraw_clear_mem);
        Napi::Object result = CreateImageDataObject(env, ownedImage.get());
        
        return result;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::CreateMemoryThumbnail(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    try {
        int errcode = 0;
        libraw_processed_image_t* img = processor->dcraw_make_mem_thumb(&errcode);
        
        if (!img || errcode != LIBRAW_SUCCESS) {
            std::string error = "Failed to create memory thumbnail: ";
            if (errcode != LIBRAW_SUCCESS) {
                error += libraw_strerror(errcode);
            } else {
                error += "Unknown error";
            }
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        std::unique_ptr<libraw_processed_image_t, void (*)(libraw_processed_image_t*)>
            ownedImage(img, &LibRaw::dcraw_clear_mem);
        Napi::Object result = CreateImageDataObject(env, ownedImage.get());
        
        return result;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// ============== FILE WRITERS ==============

Napi::Value LibRawWrapper::WritePPM(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected string filename").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filename = info[0].As<Napi::String>().Utf8Value();

    try {
        int ret = processor->dcraw_ppm_tiff_writer(filename.c_str());
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to write PPM file: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::WriteTIFF(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected string filename").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filename = info[0].As<Napi::String>().Utf8Value();

    try {
        // Set output format to TIFF
        processor->imgdata.params.output_tiff = 1;
        
        int ret = processor->dcraw_ppm_tiff_writer(filename.c_str());
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to write TIFF file: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::WriteThumbnail(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected string filename").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filename = info[0].As<Napi::String>().Utf8Value();

    try {
        int ret = processor->dcraw_thumb_writer(filename.c_str());
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to write thumbnail: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// ============== CONFIGURATION & SETTINGS ==============

Napi::Value LibRawWrapper::SetOutputParams(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsObject() || info[0].IsArray() || info[0].IsFunction()) {
        Napi::TypeError::New(env, "Expected object with output parameters").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Object params = info[0].As<Napi::Object>();

    try {
        auto setInt = [&](const char* name, int& field) {
            if (params.Has(name) && params.Get(name).IsNumber())
                field = params.Get(name).As<Napi::Number>().Int32Value();
        };
        auto setFloat = [&](const char* name, float& field) {
            if (params.Has(name) && params.Get(name).IsNumber())
                field = params.Get(name).As<Napi::Number>().FloatValue();
        };
        auto setBool = [&](const char* name, int& field) {
            if (!params.Has(name)) return;
            Napi::Value value = params.Get(name);
            if (value.IsBoolean()) field = value.As<Napi::Boolean>().Value() ? 1 : 0;
            else if (value.IsNumber()) field = value.As<Napi::Number>().Int32Value() ? 1 : 0;
        };
        auto setString = [&](const char* name, std::string& storage, char*& field) {
            if (!params.Has(name)) return;
            Napi::Value value = params.Get(name);
            if (value.IsNull() || value.IsUndefined()) {
                storage.clear();
                field = nullptr;
            } else if (value.IsString()) {
                storage = value.As<Napi::String>().Utf8Value();
                field = storage.empty() ? nullptr : storage.data();
            }
        };

        // Validate range-constrained values before mutating any output field so
        // a rejected update cannot leave a partially-applied configuration.
        if (params.Has("output_bps")) {
            if (!params.Get("output_bps").IsNumber()) {
                Napi::TypeError::New(env, "output_bps must be 8 or 16").ThrowAsJavaScriptException();
                return env.Null();
            }
            const int bits = params.Get("output_bps").As<Napi::Number>().Int32Value();
            if (bits != 8 && bits != 16) {
                Napi::RangeError::New(env, "output_bps must be 8 or 16").ThrowAsJavaScriptException();
                return env.Null();
            }
        }

        if (params.Has("gamma") && params.Get("gamma").IsArray()) {
            Napi::Array gamma = params.Get("gamma").As<Napi::Array>();
            for (uint32_t i = 0; i < 6 && i < gamma.Length(); ++i)
                if (gamma.Get(i).IsNumber())
                    processor->imgdata.params.gamm[i] = gamma.Get(i).As<Napi::Number>().DoubleValue();
        }
        if (params.Has("greybox") && params.Get("greybox").IsArray()) {
            Napi::Array values = params.Get("greybox").As<Napi::Array>();
            for (uint32_t i = 0; i < 4 && i < values.Length(); ++i)
                if (values.Get(i).IsNumber()) processor->imgdata.params.greybox[i] = values.Get(i).As<Napi::Number>().Uint32Value();
        }
        if (params.Has("cropbox") && params.Get("cropbox").IsArray()) {
            Napi::Array values = params.Get("cropbox").As<Napi::Array>();
            for (uint32_t i = 0; i < 4 && i < values.Length(); ++i)
                if (values.Get(i).IsNumber()) processor->imgdata.params.cropbox[i] = values.Get(i).As<Napi::Number>().Uint32Value();
        }
        if (params.Has("aber") && params.Get("aber").IsArray()) {
            Napi::Array values = params.Get("aber").As<Napi::Array>();
            for (uint32_t i = 0; i < 4 && i < values.Length(); ++i)
                if (values.Get(i).IsNumber()) processor->imgdata.params.aber[i] = values.Get(i).As<Napi::Number>().DoubleValue();
        }
        if (params.Has("user_mul") && params.Get("user_mul").IsArray()) {
            Napi::Array userMul = params.Get("user_mul").As<Napi::Array>();
            for (uint32_t i = 0; i < 4 && i < userMul.Length(); ++i)
                if (userMul.Get(i).IsNumber()) processor->imgdata.params.user_mul[i] = userMul.Get(i).As<Napi::Number>().FloatValue();
        }
        if (params.Has("user_cblack") && params.Get("user_cblack").IsArray()) {
            Napi::Array values = params.Get("user_cblack").As<Napi::Array>();
            for (uint32_t i = 0; i < 4 && i < values.Length(); ++i)
                if (values.Get(i).IsNumber()) processor->imgdata.params.user_cblack[i] = values.Get(i).As<Napi::Number>().Int32Value();
        }

        auto& output = processor->imgdata.params;
        setFloat("bright", output.bright); setFloat("threshold", output.threshold);
        setBool("half_size", output.half_size); setBool("four_color_rgb", output.four_color_rgb);
        setInt("highlight", output.highlight); setBool("use_auto_wb", output.use_auto_wb);
        setBool("use_camera_wb", output.use_camera_wb); setInt("use_camera_matrix", output.use_camera_matrix);
        setInt("output_color", output.output_color); setInt("output_bps", output.output_bps);
        setBool("output_tiff", output.output_tiff); setInt("output_flags", output.output_flags);
        setInt("user_flip", output.user_flip); setInt("user_qual", output.user_qual);
        setInt("user_black", output.user_black); setInt("user_sat", output.user_sat);
        setInt("med_passes", output.med_passes); setFloat("auto_bright_thr", output.auto_bright_thr);
        setFloat("adjust_maximum_thr", output.adjust_maximum_thr); setBool("no_auto_bright", output.no_auto_bright);
        setBool("use_fuji_rotate", output.use_fuji_rotate); setBool("use_p1_correction", output.use_p1_correction);
        setBool("green_matching", output.green_matching); setInt("dcb_iterations", output.dcb_iterations);
        setBool("dcb_enhance_fl", output.dcb_enhance_fl); setInt("fbdd_noiserd", output.fbdd_noiserd);
        setBool("exp_correc", output.exp_correc); setFloat("exp_shift", output.exp_shift);
        setFloat("exp_preser", output.exp_preser); setBool("no_auto_scale", output.no_auto_scale);
        setBool("no_interpolation", output.no_interpolation);
        setString("output_profile", outputProfile, output.output_profile);
        setString("camera_profile", cameraProfile, output.camera_profile);
        setString("bad_pixels", badPixels, output.bad_pixels);
        setString("dark_frame", darkFrame, output.dark_frame);

        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::GetOutputParams(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    Napi::Object params = Napi::Object::New(env);

    try {
        auto& output = processor->imgdata.params;
        auto setNumber = [&](const char* name, double value) { params.Set(name, Napi::Number::New(env, value)); };
        auto setBoolean = [&](const char* name, int value) { params.Set(name, Napi::Boolean::New(env, value != 0)); };
        auto setString = [&](const char* name, const char* value) {
            params.Set(name, value ? Napi::Value(Napi::String::New(env, value)) : Napi::Value(env.Null()));
        };
        auto numericArray = [&](const char* name, const auto* values, uint32_t count) {
            Napi::Array result = Napi::Array::New(env, count);
            for (uint32_t i = 0; i < count; ++i) result.Set(i, Napi::Number::New(env, values[i]));
            params.Set(name, result);
        };

        Napi::Array gamma = Napi::Array::New(env);
        for (uint32_t i = 0; i < 6; ++i) gamma.Set(i, Napi::Number::New(env, output.gamm[i]));
        params.Set("gamma", gamma);
        numericArray("greybox", output.greybox, 4); numericArray("cropbox", output.cropbox, 4);
        numericArray("aber", output.aber, 4); numericArray("user_mul", output.user_mul, 4);
        numericArray("user_cblack", output.user_cblack, 4);
        setNumber("bright", output.bright); setNumber("threshold", output.threshold);
        setBoolean("half_size", output.half_size); setBoolean("four_color_rgb", output.four_color_rgb);
        setNumber("highlight", output.highlight); setBoolean("use_auto_wb", output.use_auto_wb);
        setBoolean("use_camera_wb", output.use_camera_wb); setNumber("use_camera_matrix", output.use_camera_matrix);
        setNumber("output_color", output.output_color); setNumber("output_bps", output.output_bps);
        setBoolean("output_tiff", output.output_tiff); setNumber("output_flags", output.output_flags);
        setNumber("user_flip", output.user_flip); setNumber("user_qual", output.user_qual);
        setNumber("user_black", output.user_black); setNumber("user_sat", output.user_sat);
        setNumber("med_passes", output.med_passes); setNumber("auto_bright_thr", output.auto_bright_thr);
        setNumber("adjust_maximum_thr", output.adjust_maximum_thr); setBoolean("no_auto_bright", output.no_auto_bright);
        setBoolean("use_fuji_rotate", output.use_fuji_rotate); setBoolean("use_p1_correction", output.use_p1_correction);
        setBoolean("green_matching", output.green_matching); setNumber("dcb_iterations", output.dcb_iterations);
        setBoolean("dcb_enhance_fl", output.dcb_enhance_fl); setNumber("fbdd_noiserd", output.fbdd_noiserd);
        setBoolean("exp_correc", output.exp_correc); setNumber("exp_shift", output.exp_shift);
        setNumber("exp_preser", output.exp_preser); setBoolean("no_auto_scale", output.no_auto_scale);
        setBoolean("no_interpolation", output.no_interpolation);
        setString("output_profile", output.output_profile); setString("camera_profile", output.camera_profile);
        setString("bad_pixels", output.bad_pixels); setString("dark_frame", output.dark_frame);

        return params;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// ============== UTILITY FUNCTIONS ==============

Napi::Value LibRawWrapper::IsFloatingPoint(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    bool isFloating = processor->is_floating_point();
    return Napi::Boolean::New(env, isFloating);
}

Napi::Value LibRawWrapper::IsFujiRotated(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    bool isFuji = processor->is_fuji_rotated();
    return Napi::Boolean::New(env, isFuji);
}

Napi::Value LibRawWrapper::IsSRAW(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    bool isSraw = processor->is_sraw();
    return Napi::Boolean::New(env, isSraw);
}

Napi::Value LibRawWrapper::IsJPEGThumb(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    bool isJpeg = processor->is_jpeg_thumb();
    return Napi::Boolean::New(env, isJpeg);
}

Napi::Value LibRawWrapper::ErrorCount(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    int errors = processor->error_count();
    return Napi::Number::New(env, errors);
}

// ============== STATIC METHODS ==============

Napi::Value LibRawWrapper::GetVersion(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    const char* version = LibRaw::version();
    return Napi::String::New(env, version ? version : "Unknown");
}

Napi::Value LibRawWrapper::GetCapabilities(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    unsigned int caps = LibRaw::capabilities();
    return Napi::Number::New(env, caps);
}

Napi::Value LibRawWrapper::GetCameraList(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    const char** cameras = LibRaw::cameraList();
    Napi::Array result = Napi::Array::New(env);

    if (cameras) {
        uint32_t index = 0;
        while (cameras[index] != nullptr) {
            result.Set(index, Napi::String::New(env, cameras[index]));
            index++;
        }
    }

    return result;
}

Napi::Value LibRawWrapper::GetCameraCount(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    int count = LibRaw::cameraCount();
    return Napi::Number::New(env, count);
}

Napi::Value LibRawWrapper::CameraMakerIndexToMaker(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Expected camera maker index").ThrowAsJavaScriptException();
        return env.Null();
    }
    const char* maker = LibRaw::cameramakeridx2maker(info[0].As<Napi::Number>().Uint32Value());
    return maker ? Napi::String::New(env, maker) : env.Null();
}

Napi::Value LibRawWrapper::SimplifyMakeModel(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsString() || !info[2].IsString()) {
        Napi::TypeError::New(env, "Expected maker index, make, and model").ThrowAsJavaScriptException();
        return env.Null();
    }
    unsigned int makerIndex = info[0].As<Napi::Number>().Uint32Value();
    std::string inputMake = info[1].As<Napi::String>().Utf8Value();
    std::string inputModel = info[2].As<Napi::String>().Utf8Value();
    std::vector<char> make(256, 0);
    std::vector<char> model(256, 0);
    std::snprintf(make.data(), make.size(), "%s", inputMake.c_str());
    std::snprintf(model.data(), model.size(), "%s", inputModel.c_str());
    int ret = LibRaw::simplify_make_model(&makerIndex, make.data(), make.size(), model.data(), model.size());
    Napi::Object result = Napi::Object::New(env);
    result.Set("result", ret);
    result.Set("makerIndex", makerIndex);
    result.Set("make", make.data());
    result.Set("model", model.data());
    return result;
}

Napi::Value LibRawWrapper::StrProgress(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Expected progress code").ThrowAsJavaScriptException();
        return env.Null();
    }
    const char* value = LibRaw::strprogress(static_cast<LibRaw_progress>(info[0].As<Napi::Number>().Int32Value()));
    return Napi::String::New(env, value ? value : "Unknown progress");
}

// ============== EXTENDED UTILITY FUNCTIONS ==============

Napi::Value LibRawWrapper::IsNikonSRAW(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    bool isNikonSraw = processor->is_nikon_sraw();
    return Napi::Boolean::New(env, isNikonSraw);
}

Napi::Value LibRawWrapper::IsCoolscanNEF(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    bool isCoolscan = processor->is_coolscan_nef();
    return Napi::Boolean::New(env, isCoolscan);
}

Napi::Value LibRawWrapper::HaveFPData(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    bool haveFP = processor->have_fpdata();
    return Napi::Boolean::New(env, haveFP);
}

Napi::Value LibRawWrapper::SrawMidpoint(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    int midpoint = processor->sraw_midpoint();
    return Napi::Number::New(env, midpoint);
}

Napi::Value LibRawWrapper::ThumbOK(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    try {
        // thumbOK can take a max size parameter, default -1 for no limit
        INT64 maxSize = -1;
        if (info.Length() > 0 && info[0].IsNumber()) {
            maxSize = info[0].As<Napi::Number>().Int64Value();
        }
        
        int result = processor->thumbOK(maxSize);
        return Napi::Number::New(env, result);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::UnpackFunctionName(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    const char* name = processor->unpack_function_name();
    return Napi::String::New(env, name ? name : "Unknown");
}

Napi::Value LibRawWrapper::GetDecoderInfo(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    try {
        libraw_decoder_info_t decoder_info;
        int ret = processor->get_decoder_info(&decoder_info);
        
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to get decoder info: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        Napi::Object result = Napi::Object::New(env);
        result.Set("decoder_name", Napi::String::New(env, decoder_info.decoder_name ? decoder_info.decoder_name : "Unknown"));
        result.Set("decoder_flags", Napi::Number::New(env, decoder_info.decoder_flags));
        
        return result;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// ============== ADVANCED PROCESSING ==============

Napi::Value LibRawWrapper::Unpack(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    try {
        int ret = processor->unpack();
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to unpack: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::Raw2ImageEx(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    try {
        // Default to subtract black, can be overridden
        int do_subtract_black = 1;
        if (info.Length() > 0 && info[0].IsBoolean()) {
            do_subtract_black = info[0].As<Napi::Boolean>().Value() ? 1 : 0;
        }
        
        int ret = processor->raw2image_ex(do_subtract_black);
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to convert raw to image: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::AdjustSizesInfoOnly(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    try {
        int ret = processor->adjust_sizes_info_only();
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to adjust sizes: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::FreeImage(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    processor->free_image();
    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::ConvertFloatToInt(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    try {
        // Default values from LibRaw
        float dmin = 4096.0f;
        float dmax = 32767.0f;
        float dtarget = 16383.0f;
        
        if (info.Length() > 0 && info[0].IsNumber()) {
            dmin = info[0].As<Napi::Number>().FloatValue();
        }
        if (info.Length() > 1 && info[1].IsNumber()) {
            dmax = info[1].As<Napi::Number>().FloatValue();
        }
        if (info.Length() > 2 && info[2].IsNumber()) {
            dtarget = info[2].As<Napi::Number>().FloatValue();
        }
        
        processor->convertFloatToInt(dmin, dmax, dtarget);
        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// ============== MEMORY OPERATIONS EXTENDED ==============

Napi::Value LibRawWrapper::GetMemImageFormat(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    try {
        int width, height, colors, bps;
        processor->get_mem_image_format(&width, &height, &colors, &bps);
        
        Napi::Object result = Napi::Object::New(env);
        result.Set("width", Napi::Number::New(env, width));
        result.Set("height", Napi::Number::New(env, height));
        result.Set("colors", Napi::Number::New(env, colors));
        result.Set("bps", Napi::Number::New(env, bps));
        
        return result;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::CopyMemImage(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    if (info.Length() < 3 || !info[0].IsBuffer() || !info[1].IsNumber() || !info[2].IsBoolean()) {
        Napi::TypeError::New(env, "Expected (buffer, stride, bgr)").ThrowAsJavaScriptException();
        return env.Null();
    }

    try {
        Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
        int stride = info[1].As<Napi::Number>().Int32Value();
        int bgr = info[2].As<Napi::Boolean>().Value() ? 1 : 0;

        int width = 0, height = 0, colors = 0, bitsPerSample = 0;
        processor->get_mem_image_format(&width, &height, &colors, &bitsPerSample);
        if (width <= 0 || height <= 0 || colors <= 0 ||
            (bitsPerSample != 8 && bitsPerSample != 16)) {
            Napi::Error::New(env, "Invalid processed image format").ThrowAsJavaScriptException();
            return env.Null();
        }
        const size_t bytesPerSample = static_cast<size_t>(bitsPerSample / 8);
        const size_t rowBytes = static_cast<size_t>(width) * static_cast<size_t>(colors) * bytesPerSample;
        if (stride < 0 || static_cast<size_t>(stride) < rowBytes) {
            Napi::RangeError::New(env, "Stride is smaller than one processed image row").ThrowAsJavaScriptException();
            return env.Null();
        }
        const size_t rowStride = static_cast<size_t>(stride);
        if (static_cast<size_t>(height - 1) >
            (std::numeric_limits<size_t>::max() - rowBytes) / rowStride) {
            Napi::RangeError::New(env, "Processed image buffer size overflow").ThrowAsJavaScriptException();
            return env.Null();
        }
        const size_t required = static_cast<size_t>(height - 1) * rowStride + rowBytes;
        if (buffer.Length() < required) {
            Napi::RangeError::New(env, "Destination Buffer is too small for the processed image").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        int ret = processor->copy_mem_image(buffer.Data(), stride, bgr);
        if (ret != LIBRAW_SUCCESS) {
            std::string error = "Failed to copy memory image: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// ============== COLOR OPERATIONS ==============

Napi::Value LibRawWrapper::GetColorAt(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
        Napi::TypeError::New(env, "Expected (row, col)").ThrowAsJavaScriptException();
        return env.Null();
    }

    try {
        int row = info[0].As<Napi::Number>().Int32Value();
        int col = info[1].As<Napi::Number>().Int32Value();
        
        int color = processor->COLOR(row, col);
        return Napi::Number::New(env, color);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::GetFilterColorAt(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
        Napi::TypeError::New(env, "Expected (row, col)").ThrowAsJavaScriptException();
        return env.Null();
    }
    return Napi::Number::New(env, processor->FC(
        info[0].As<Napi::Number>().Int32Value(),
        info[1].As<Napi::Number>().Int32Value()));
}

Napi::Value LibRawWrapper::GetFcol(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
        Napi::TypeError::New(env, "Expected (row, col)").ThrowAsJavaScriptException();
        return env.Null();
    }
    return Napi::Number::New(env, processor->fcol(
        info[0].As<Napi::Number>().Int32Value(),
        info[1].As<Napi::Number>().Int32Value()));
}

Napi::Value LibRawWrapper::PhaseOneSubtractBlack(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();
    if (info.Length() < 1 || !info[0].IsBuffer()) {
        Napi::TypeError::New(env, "Expected 16-bit source Buffer").ThrowAsJavaScriptException();
        return env.Null();
    }
    Napi::Buffer<uint8_t> source = info[0].As<Napi::Buffer<uint8_t>>();
    if (source.Length() % sizeof(ushort) != 0) {
        Napi::RangeError::New(env, "Source Buffer length must be divisible by two").ThrowAsJavaScriptException();
        return env.Null();
    }
    const size_t rawWidth = processor->imgdata.rawdata.sizes.raw_width;
    const size_t rawHeight = processor->imgdata.rawdata.sizes.raw_height;
    if (!rawWidth || !rawHeight || rawWidth > std::numeric_limits<size_t>::max() / rawHeight) {
        Napi::Error::New(env, "Invalid Phase One RAW dimensions").ThrowAsJavaScriptException();
        return env.Null();
    }
    const size_t count = rawWidth * rawHeight;
    if (count > std::numeric_limits<size_t>::max() / sizeof(ushort) ||
        source.Length() < count * sizeof(ushort)) {
        Napi::RangeError::New(env, "Source Buffer is too small for the Phase One RAW frame").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::vector<ushort> alignedSource(count);
    std::vector<ushort> destination(count);
    const size_t byteLength = count * sizeof(ushort);
    std::memcpy(alignedSource.data(), source.Data(), byteLength);
    int ret = processor->phase_one_subtract_black(alignedSource.data(), destination.data());
    if (ret != LIBRAW_SUCCESS) {
        Napi::Error error = Napi::Error::New(env, libraw_strerror(ret));
        error.Set("librawCode", Napi::Number::New(env, ret));
        error.ThrowAsJavaScriptException();
        return env.Null();
    }
    return Napi::Buffer<uint8_t>::Copy(
        env, reinterpret_cast<uint8_t*>(destination.data()), byteLength);
}

Napi::Value LibRawWrapper::PhaseOneCorrect(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();
    int ret = processor->phase_one_correct();
    if (ret != LIBRAW_SUCCESS) {
        Napi::Error error = Napi::Error::New(env, libraw_strerror(ret));
        error.Set("librawCode", Napi::Number::New(env, ret));
        error.ThrowAsJavaScriptException();
        return env.Null();
    }
    return env.Undefined();
}

Napi::Value LibRawWrapper::SetRawSpeedCameraFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected camera file path").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::string filename = info[0].As<Napi::String>().Utf8Value();
    int ret = processor->set_rawspeed_camerafile(filename.data());
    if (ret != LIBRAW_SUCCESS) {
        Napi::Error error = Napi::Error::New(env, libraw_strerror(ret));
        error.Set("librawCode", Napi::Number::New(env, ret));
        error.ThrowAsJavaScriptException();
        return env.Null();
    }
    return env.Undefined();
}

Napi::Value LibRawWrapper::AdobeCoeff(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsString()) {
        Napi::TypeError::New(env, "Expected maker index and model").ThrowAsJavaScriptException();
        return env.Null();
    }
    unsigned int maker = info[0].As<Napi::Number>().Uint32Value();
    std::string model = info[1].As<Napi::String>().Utf8Value();
    int internalOnly = info.Length() > 2 && info[2].ToBoolean().Value() ? 1 : 0;
    int ret = processor->adobe_coeff(maker, model.c_str(), internalOnly);
    if (ret != LIBRAW_SUCCESS) {
        Napi::Error error = Napi::Error::New(env, libraw_strerror(ret));
        error.Set("librawCode", Napi::Number::New(env, ret));
        error.ThrowAsJavaScriptException();
        return env.Null();
    }
    return env.Undefined();
}

// ============== CANCELLATION SUPPORT ==============

Napi::Value LibRawWrapper::SetCancelFlag(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    processor->setCancelFlag();
    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::ClearCancelFlag(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    processor->clearCancelFlag();
    return Napi::Boolean::New(env, true);
}

// ============== VERSION INFORMATION (INSTANCE METHODS) ==============

Napi::Value LibRawWrapper::Version(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    const char* version = processor->version();
    return Napi::String::New(env, version);
}

Napi::Value LibRawWrapper::VersionNumber(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    int versionNum = processor->versionNumber();
    
    int major = (versionNum >> 16) & 0xff;
    int minor = (versionNum >> 8) & 0xff;
    int patch = versionNum & 0xff;
    
    Napi::Array result = Napi::Array::New(env, 3);
    result[static_cast<uint32_t>(0)] = Napi::Number::New(env, major);
    result[static_cast<uint32_t>(1)] = Napi::Number::New(env, minor);
    result[static_cast<uint32_t>(2)] = Napi::Number::New(env, patch);
    
    return result;
}

// ============== ERROR HANDLING ==============

Napi::Value LibRawWrapper::GetLastError(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // LibRaw doesn't store the last error, so we return a generic message
    // In practice, errors are thrown as exceptions
    return Napi::String::New(env, "No error information available");
}

Napi::Value LibRawWrapper::Strerror(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Expected error code as number").ThrowAsJavaScriptException();
        return env.Null();
    }

    int errorCode = info[0].As<Napi::Number>().Int32Value();
    const char* errorMsg = processor->strerror(errorCode);
    return Napi::String::New(env, errorMsg);
}
