{
  "targets": [
    {
      "target_name": "zlib",
      "type": "static_library",
      "sources": [
        "vendor/zlib-1.3.2/adler32.c",
        "vendor/zlib-1.3.2/compress.c",
        "vendor/zlib-1.3.2/crc32.c",
        "vendor/zlib-1.3.2/deflate.c",
        "vendor/zlib-1.3.2/infback.c",
        "vendor/zlib-1.3.2/inffast.c",
        "vendor/zlib-1.3.2/inflate.c",
        "vendor/zlib-1.3.2/inftrees.c",
        "vendor/zlib-1.3.2/trees.c",
        "vendor/zlib-1.3.2/uncompr.c",
        "vendor/zlib-1.3.2/zutil.c"
      ],
      "defines": ["ZLIB_CONST"],
      "xcode_settings": {
        "MACOSX_DEPLOYMENT_TARGET": "11.0"
      },
      "direct_dependent_settings": {
        "include_dirs": ["vendor/zlib-1.3.2"]
      }
    },
    {
      "target_name": "libraw",
      "type": "static_library",
      "sources": ["<!@(node scripts/list-libraw-sources.js)"],
      "dependencies": ["zlib"],
      "include_dirs": [
        "vendor/libraw-0.22.2",
        "vendor/libraw-0.22.2/libraw",
        "vendor/zlib-1.3.2"
      ],
      "defines": [
        "LIBRAW_NODLL",
        "USE_ZLIB"
      ],
      "cflags_cc": ["-std=c++17", "-fexceptions"],
      "xcode_settings": {
        "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
        "CLANG_CXX_LIBRARY": "libc++",
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "MACOSX_DEPLOYMENT_TARGET": "11.0"
      },
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "AdditionalOptions": ["/std:c++17"]
        }
      }
    },
    {
      "target_name": "libraw_addon",
      "sources": [
        "src/addon.cpp",
        "src/libraw_wrapper.cpp"
      ],
      "dependencies": ["libraw"],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "vendor/libraw-0.22.2",
        "vendor/libraw-0.22.2/libraw"
      ],
      "defines": [
        "NAPI_VERSION=8",
        "LIBRAW_NODLL",
        "USE_ZLIB"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "cflags_cc": ["-std=c++17", "-fexceptions"],
      "xcode_settings": {
        "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
        "CLANG_CXX_LIBRARY": "libc++",
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "MACOSX_DEPLOYMENT_TARGET": "11.0"
      },
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "AdditionalOptions": ["/std:c++17"]
        }
      }
    }
  ]
}
