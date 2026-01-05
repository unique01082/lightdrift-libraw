#include "libraw_wrapper.h"
#include <iostream>
#include <sstream>
#include <vector>

Napi::FunctionReference LibRawWrapper::constructor;

Napi::Object LibRawWrapper::Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);

    Napi::Function func = DefineClass(env, "LibRawWrapper", {
        // File Operations
        InstanceMethod("loadFile", &LibRawWrapper::LoadFile),
        InstanceMethod("loadBuffer", &LibRawWrapper::LoadBuffer),
        InstanceMethod("loadBayerData", &LibRawWrapper::LoadBayerData),
        InstanceMethod("close", &LibRawWrapper::Close),
        
        // Error Handling
        InstanceMethod("getLastError", &LibRawWrapper::GetLastError),
        InstanceMethod("strerror", &LibRawWrapper::Strerror),
        
        // Metadata & Information
        InstanceMethod("getMetadata", &LibRawWrapper::GetMetadata),
        InstanceMethod("getImageSize", &LibRawWrapper::GetImageSize),
        InstanceMethod("getAdvancedMetadata", &LibRawWrapper::GetAdvancedMetadata),
        InstanceMethod("getLensInfo", &LibRawWrapper::GetLensInfo),
        InstanceMethod("getColorInfo", &LibRawWrapper::GetColorInfo),
        
        // Image Processing
        InstanceMethod("unpackThumbnail", &LibRawWrapper::UnpackThumbnail),
        InstanceMethod("processImage", &LibRawWrapper::ProcessImage),
        InstanceMethod("subtractBlack", &LibRawWrapper::SubtractBlack),
        InstanceMethod("raw2Image", &LibRawWrapper::Raw2Image),
        InstanceMethod("adjustMaximum", &LibRawWrapper::AdjustMaximum),
        
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
        StaticMethod("getCameraCount", &LibRawWrapper::GetCameraCount)
    });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("LibRawWrapper", func);
    return exports;
}

LibRawWrapper::LibRawWrapper(const Napi::CallbackInfo& info) 
    : Napi::ObjectWrap<LibRawWrapper>(info), isLoaded(false), isUnpacked(false), isProcessed(false) {
    Napi::Env env = info.Env();
    Napi::HandleScope scope(env);

    try {
        processor = std::make_unique<LibRaw>();
    } catch (const std::exception& e) {
        std::string errorMsg = "Failed to initialize LibRaw: ";
        errorMsg += e.what();
        Napi::TypeError::New(env, errorMsg).ThrowAsJavaScriptException();
    }
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

Napi::Value LibRawWrapper::LoadFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected string filename").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filename = info[0].As<Napi::String>().Utf8Value();

    try {
        int ret = processor->open_file(filename.c_str());
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

    std::string filename = info[0].As<Napi::String>().Utf8Value();
    Napi::Object fileProperty = info[1].As<Napi::Object>();

    if (!fileProperty.Has("width") || !fileProperty.Get("width").IsNumber()) {
        Napi::TypeError::New(env, "Undefined width of file").ThrowAsJavaScriptException();
        return env.Null(); 
    }

    if (!fileProperty.Has("height") || !fileProperty.Get("height").IsNumber()) {
        Napi::TypeError::New(env, "Undefined height of file").ThrowAsJavaScriptException();
        return env.Null(); 
    }

    FILE *in = fopen(filename.c_str(), "rb");
    fseek(in, 0, SEEK_END);
    unsigned fsz = ftell(in);
    fseek(in, 0, SEEK_SET);

    unsigned char *buffer = (unsigned char *)malloc(fsz);
    if (!buffer) {
        fclose(in);
        Napi::Error::New(env, "Memory allocation failed").ThrowAsJavaScriptException();
        return env.Null();
    }

    unsigned bytesRead = fread(buffer, 1, fsz, in);
    fclose(in);
    if (bytesRead != fsz) {
        free(buffer);
        Napi::Error::New(env, "Failed to read file").ThrowAsJavaScriptException();
        return env.Null();
    }

    processor->imgdata.params.output_tiff = 1;

    try {
        int ret = processor->open_bayer(
            buffer, 
            fsz, 
            fileProperty.Get("width").As<Napi::Number>().Uint32Value(), 
            fileProperty.Get("height").As<Napi::Number>().Uint32Value(), 
            0, 0, 0, 0, 0,
            LIBRAW_OPENBAYER_BGGR, 0, 0, 0);

        if (ret != LIBRAW_SUCCESS) {
            free(buffer);
            std::string error = "Failed to open file: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        ret = processor->unpack();
        if (ret != LIBRAW_SUCCESS) {
            free(buffer);
            std::string error = "Failed to unpack file: ";
            error += libraw_strerror(ret);
            Napi::Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        free(buffer);

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

        Napi::Object result = CreateImageDataObject(env, img);
        LibRaw::dcraw_clear_mem(img);
        
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

        Napi::Object result = CreateImageDataObject(env, img);
        LibRaw::dcraw_clear_mem(img);
        
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
    if (!CheckLoaded(env)) return env.Null();

    if (info.Length() < 1 || !info[0].IsObject() || info[0].IsArray() || info[0].IsFunction()) {
        Napi::TypeError::New(env, "Expected object with output parameters").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Object params = info[0].As<Napi::Object>();

    try {
        // Gamma settings
        if (params.Has("gamma") && params.Get("gamma").IsArray()) {
            Napi::Array gamma = params.Get("gamma").As<Napi::Array>();
            if (gamma.Length() >= 2) {
                processor->imgdata.params.gamm[0] = gamma.Get(0u).As<Napi::Number>().DoubleValue();
                processor->imgdata.params.gamm[1] = gamma.Get(1u).As<Napi::Number>().DoubleValue();
            }
        }

        // Brightness
        if (params.Has("bright") && params.Get("bright").IsNumber()) {
            processor->imgdata.params.bright = params.Get("bright").As<Napi::Number>().FloatValue();
        }

        // Output color space
        if (params.Has("output_color") && params.Get("output_color").IsNumber()) {
            processor->imgdata.params.output_color = params.Get("output_color").As<Napi::Number>().Int32Value();
        }

        // Output bits per sample
        if (params.Has("output_bps") && params.Get("output_bps").IsNumber()) {
            processor->imgdata.params.output_bps = params.Get("output_bps").As<Napi::Number>().Int32Value();
        }

        // User multipliers
        if (params.Has("user_mul") && params.Get("user_mul").IsArray()) {
            Napi::Array userMul = params.Get("user_mul").As<Napi::Array>();
            for (uint32_t i = 0; i < 4 && i < userMul.Length(); i++) {
                processor->imgdata.params.user_mul[i] = userMul.Get(i).As<Napi::Number>().FloatValue();
            }
        }

        // Auto bright
        if (params.Has("no_auto_bright") && params.Get("no_auto_bright").IsBoolean()) {
            processor->imgdata.params.no_auto_bright = params.Get("no_auto_bright").As<Napi::Boolean>().Value() ? 1 : 0;
        }

        // Highlight mode
        if (params.Has("highlight") && params.Get("highlight").IsNumber()) {
            processor->imgdata.params.highlight = params.Get("highlight").As<Napi::Number>().Int32Value();
        }

        // Output TIFF
        if (params.Has("output_tiff") && params.Get("output_tiff").IsBoolean()) {
            processor->imgdata.params.output_tiff = params.Get("output_tiff").As<Napi::Boolean>().Value() ? 1 : 0;
        }

        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value LibRawWrapper::GetOutputParams(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!CheckLoaded(env)) return env.Null();

    Napi::Object params = Napi::Object::New(env);

    try {
        // Gamma
        Napi::Array gamma = Napi::Array::New(env);
        gamma.Set(0u, Napi::Number::New(env, processor->imgdata.params.gamm[0]));
        gamma.Set(1u, Napi::Number::New(env, processor->imgdata.params.gamm[1]));
        params.Set("gamma", gamma);

        // Other parameters
        params.Set("bright", Napi::Number::New(env, processor->imgdata.params.bright));
        params.Set("output_color", Napi::Number::New(env, processor->imgdata.params.output_color));
        params.Set("output_bps", Napi::Number::New(env, processor->imgdata.params.output_bps));
        params.Set("no_auto_bright", Napi::Boolean::New(env, processor->imgdata.params.no_auto_bright));
        params.Set("highlight", Napi::Number::New(env, processor->imgdata.params.highlight));
        params.Set("output_tiff", Napi::Boolean::New(env, processor->imgdata.params.output_tiff));

        // User multipliers
        Napi::Array userMul = Napi::Array::New(env);
        for (int i = 0; i < 4; i++) {
            userMul.Set(i, Napi::Number::New(env, processor->imgdata.params.user_mul[i]));
        }
        params.Set("user_mul", userMul);

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
    
    // LibRaw version number is encoded as XXYYZZ where XX.YY.ZZ is the version
    int major = versionNum / 10000;
    int minor = (versionNum % 10000) / 100;
    int patch = versionNum % 100;
    
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
