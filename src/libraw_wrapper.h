#ifndef LIBRAW_WRAPPER_H
#define LIBRAW_WRAPPER_H

#include <napi.h>
#include <string>
#include <memory>
#include <cstdint>
#include <mutex>
#include <vector>
#include "libraw.h"

class LibRawWrapper : public Napi::ObjectWrap<LibRawWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    LibRawWrapper(const Napi::CallbackInfo& info);
    ~LibRawWrapper();

private:
    // File Operations
    Napi::Value OpenFile(const Napi::CallbackInfo& info);
    Napi::Value OpenBuffer(const Napi::CallbackInfo& info);
    Napi::Value OpenBayer(const Napi::CallbackInfo& info);
    Napi::Value LoadFile(const Napi::CallbackInfo& info);
    Napi::Value LoadBayerData(const Napi::CallbackInfo& info);
    Napi::Value LoadBuffer(const Napi::CallbackInfo& info);
    Napi::Value Close(const Napi::CallbackInfo& info);
    Napi::Value Recycle(const Napi::CallbackInfo& info);
    Napi::Value RecycleDatastream(const Napi::CallbackInfo& info);
    Napi::Value DrainEvents(const Napi::CallbackInfo& info);
    Napi::Value SetCancellationBuffer(const Napi::CallbackInfo& info);
    
    // Metadata & Information
    Napi::Value GetMetadata(const Napi::CallbackInfo& info);
    Napi::Value GetImageSize(const Napi::CallbackInfo& info);
    Napi::Value GetAdvancedMetadata(const Napi::CallbackInfo& info);
    Napi::Value GetLensInfo(const Napi::CallbackInfo& info);
    Napi::Value GetColorInfo(const Napi::CallbackInfo& info);
    Napi::Value GetRawImageBuffer(const Napi::CallbackInfo& info);
    
    // Image Processing
    Napi::Value UnpackThumbnail(const Napi::CallbackInfo& info);
    Napi::Value UnpackThumbnailEx(const Napi::CallbackInfo& info);
    Napi::Value ProcessImage(const Napi::CallbackInfo& info);
    Napi::Value SubtractBlack(const Napi::CallbackInfo& info);
    Napi::Value SubtractBlackInternal(const Napi::CallbackInfo& info);
    Napi::Value Raw2Image(const Napi::CallbackInfo& info);
    Napi::Value Raw2ImageStart(const Napi::CallbackInfo& info);
    Napi::Value AdjustMaximum(const Napi::CallbackInfo& info);
    Napi::Value AdjustToRawInsetCrop(const Napi::CallbackInfo& info);
    Napi::Value SetMakeFromIndex(const Napi::CallbackInfo& info);
    
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
    Napi::Value GetFilterColorAt(const Napi::CallbackInfo& info);
    Napi::Value GetFcol(const Napi::CallbackInfo& info);

    // Phase One and optional decoder helpers
    Napi::Value PhaseOneSubtractBlack(const Napi::CallbackInfo& info);
    Napi::Value PhaseOneCorrect(const Napi::CallbackInfo& info);
    Napi::Value AdobeCoeff(const Napi::CallbackInfo& info);
    
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
    static Napi::Value CameraMakerIndexToMaker(const Napi::CallbackInfo& info);
    static Napi::Value SimplifyMakeModel(const Napi::CallbackInfo& info);
    static Napi::Value StrProgress(const Napi::CallbackInfo& info);
    
    // Helper methods
    Napi::Object CreateImageDataObject(Napi::Env env, libraw_processed_image_t* img);
    bool CheckLoaded(Napi::Env env);

    enum class NativeEventType { Progress, DataError, ExifTag, MakerNote };
    struct NativeEvent {
        NativeEventType type;
        int64_t a = 0;
        int64_t b = 0;
        int64_t c = 0;
        int64_t d = 0;
        std::string message;
    };
    static int ProgressCallback(void* context, enum LibRaw_progress stage, int iteration, int expected);
    static void DataErrorCallback(void* context, const char* file, const INT64 offset);
    static void ExifTagCallback(void* context, int tag, int type, int len, unsigned int order, void* stream, INT64 base);
    static void MakerNoteCallback(void* context, int tag, int type, int len, unsigned int order, void* stream, INT64 base);
    void PushEvent(NativeEvent event);
    
    // LibRaw instance
    std::unique_ptr<LibRaw> processor;
    bool isLoaded;
    bool isUnpacked;
    bool isProcessed;
    std::mutex eventMutex;
    std::vector<NativeEvent> events;
    volatile int32_t* cancellationFlag = nullptr;
    std::string outputProfile;
    std::string cameraProfile;
    std::string badPixels;
    std::string darkFrame;
};

#endif // LIBRAW_WRAPPER_H
