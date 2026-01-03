{
  "targets": [
    {
      "target_name": "libraw_addon",
      "sources": [
        "src/addon.cpp",
        "src/libraw_wrapper.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "conditions": [
        ['OS=="win"', {
          "include_dirs": [
            "deps/LibRaw-Win64/LibRaw-0.21.4/libraw",
            "deps/LibRaw-Win64/LibRaw-0.21.4"
          ],
          "libraries": [
            "<(module_root_dir)/deps/LibRaw-Win64/LibRaw-0.21.4/lib/libraw.lib"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "RuntimeLibrary": 2
            }
          },
          "copies": [
            {
              "destination": "<(module_root_dir)/build/Release/",
              "files": [
                "<(module_root_dir)/deps/LibRaw-Win64/LibRaw-0.21.4/bin/libraw.dll"
              ]
            }
          ]
        }],
        ['OS=="linux"', {
          "libraries": ["-lraw"],
          "cflags": ["-fexceptions"],
          "cflags_cc": ["-fexceptions"]
        }],
        ['OS=="mac"', {
          "libraries": ["-lraw"],
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "CLANG_CXX_LIBRARY": "libc++",
            "MACOSX_DEPLOYMENT_TARGET": "10.9"
          }
        }]
      ]
    }
  ]
}
