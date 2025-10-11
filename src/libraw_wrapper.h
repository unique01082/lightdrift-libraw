#ifndef LIBRAW_WRAPPER_H
#define LIBRAW_WRAPPER_H

#include <napi.h>
#include <string>
#include <memory>
#include "libraw.h"

class LibRawWrapper : public Napi::ObjectWrap<LibRawWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    LibRawWrapper(const Napi::CallbackInfo& info);
    ~LibRawWrapper();

private:
    static Napi::FunctionReference constructor;
    
    // File Operations
    Napi::Value LoadFile(const Napi::CallbackInfo& info);
    Napi::Value LoadBayerData(const Napi::CallbackInfo& info);
    Napi::Value LoadBuffer(const Napi::CallbackInfo& info);
    Napi::Value Close(const Napi::CallbackInfo& info);
    
    // Metadata & Information
    Napi::Value GetMetadata(const Napi::CallbackInfo& info);
    Napi::Value GetImageSize(const Napi::CallbackInfo& info);
    Napi::Value GetAdvancedMetadata(const Napi::CallbackInfo& info);
    Napi::Value GetLensInfo(const Napi::CallbackInfo& info);
    Napi::Value GetColorInfo(const Napi::CallbackInfo& info);
    
    // Image Processing
    Napi::Value UnpackThumbnail(const Napi::CallbackInfo& info);
    Napi::Value ProcessImage(const Napi::CallbackInfo& info);
    Napi::Value SubtractBlack(const Napi::CallbackInfo& info);
    Napi::Value Raw2Image(const Napi::CallbackInfo& info);
    Napi::Value AdjustMaximum(const Napi::CallbackInfo& info);
    
    // Memory Image Creation
    Napi::Value CreateMemoryImage(const Napi::CallbackInfo& info);
    Napi::Value CreateMemoryThumbnail(const Napi::CallbackInfo& info);
    
    // File Writers
    Napi::Value WritePPM(const Napi::CallbackInfo& info);
    Napi::Value WriteTIFF(const Napi::CallbackInfo& info);
    Napi::Value WriteThumbnail(const Napi::CallbackInfo& info);
    
    // Configuration & Settings
    Napi::Value SetOutputParams(const Napi::CallbackInfo& info);
    Napi::Value GetOutputParams(const Napi::CallbackInfo& info);
    
    // Utility Functions
    Napi::Value IsFloatingPoint(const Napi::CallbackInfo& info);
    Napi::Value IsFujiRotated(const Napi::CallbackInfo& info);
    Napi::Value IsSRAW(const Napi::CallbackInfo& info);
    Napi::Value IsJPEGThumb(const Napi::CallbackInfo& info);
    Napi::Value ErrorCount(const Napi::CallbackInfo& info);
    
    // Error Handling
    Napi::Value GetLastError(const Napi::CallbackInfo& info);
    Napi::Value Strerror(const Napi::CallbackInfo& info);
    
    // Extended Utility Functions
    Napi::Value IsNikonSRAW(const Napi::CallbackInfo& info);
    Napi::Value IsCoolscanNEF(const Napi::CallbackInfo& info);
    Napi::Value HaveFPData(const Napi::CallbackInfo& info);
    Napi::Value SrawMidpoint(const Napi::CallbackInfo& info);
    Napi::Value ThumbOK(const Napi::CallbackInfo& info);
    Napi::Value UnpackFunctionName(const Napi::CallbackInfo& info);
    Napi::Value GetDecoderInfo(const Napi::CallbackInfo& info);
    
    // Advanced Processing
    Napi::Value Unpack(const Napi::CallbackInfo& info);
    Napi::Value Raw2ImageEx(const Napi::CallbackInfo& info);
    Napi::Value AdjustSizesInfoOnly(const Napi::CallbackInfo& info);
    Napi::Value FreeImage(const Napi::CallbackInfo& info);
    Napi::Value ConvertFloatToInt(const Napi::CallbackInfo& info);
    
    // Memory Operations Extended
    Napi::Value GetMemImageFormat(const Napi::CallbackInfo& info);
    Napi::Value CopyMemImage(const Napi::CallbackInfo& info);
    
    // Color Operations
    Napi::Value GetColorAt(const Napi::CallbackInfo& info);
    
    // Cancellation Support
    Napi::Value SetCancelFlag(const Napi::CallbackInfo& info);
    Napi::Value ClearCancelFlag(const Napi::CallbackInfo& info);
    
    // Version Information (Instance Methods)
    Napi::Value Version(const Napi::CallbackInfo& info);
    Napi::Value VersionNumber(const Napi::CallbackInfo& info);
    
    // Static Methods
    static Napi::Value GetVersion(const Napi::CallbackInfo& info);
    static Napi::Value GetCapabilities(const Napi::CallbackInfo& info);
    static Napi::Value GetCameraList(const Napi::CallbackInfo& info);
    static Napi::Value GetCameraCount(const Napi::CallbackInfo& info);
    
    // Helper methods
    Napi::Object CreateImageDataObject(Napi::Env env, libraw_processed_image_t* img);
    bool CheckLoaded(Napi::Env env);
    
    // LibRaw instance
    std::unique_ptr<LibRaw> processor;
    bool isLoaded;
    bool isUnpacked;
    bool isProcessed;
};

#endif // LIBRAW_WRAPPER_H
