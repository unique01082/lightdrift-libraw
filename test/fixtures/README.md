# RAW fixture provenance

The Canon, Nikon, Sony, Olympus, and DNG fixtures below come from
[raw.pixls.us](https://raw.pixls.us/). Uploaders declare ownership and release
each file under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/),
so the files can be redistributed with this test suite. Fixtures are kept in
Git and excluded from the npm package.

| Local file | Source | SHA-256 |
| --- | --- | --- |
| `raw/canon-eos-350d.cr2` | `https://raw.pixls.us/data/Canon/EOS%20350D/IMG_1707.CR2` | `8cbb84e04d93b005fe082da9c954122a612b5281af00aa088d767850f343fd38` |
| `raw/nikon-d40.nef` | `https://raw.pixls.us/data/Nikon/D40/DSC_1842.NEF` | `44e88bc77b7a531b22647bcd07b9393c4568062e8f0906d3bbdecb42fbe29e03` |
| `raw/sony-nex-3.arw` | `https://raw.pixls.us/data/Sony/NEX-3/RAW_SONY_NEX3.ARW` | `eeaaa6f8c246021c90c0ee29f6624e05ee6175601c85f4699e642f63a66df57d` |
| `raw/olympus-e-1.orf` | `https://raw.pixls.us/data/Olympus/E-1/E_1__C106743_gredos.ORF` | `042286653fbae5b085bef4a4e626145385ea6e82e817f166b4904abcef64457c` |
| `raw/google-pixel-3a.dng` | `https://raw.pixls.us/data/Google/Pixel%203a/IMG_20190918_164153.dng` | `78c7bec867f3f739d43df6f027fad36ead73502d062570ce6ca14f59cdc4a0dd` |

The RAF and RW2 fixtures used by the stable suite are maintainer-supplied files
that entered this repository in commit `f4238b45d0242725155951e9240fd2672a65bb07`.
Their redistribution is part of the Stable v1 plan's explicit test-fixture
authorization; the hashes below make that authorization auditable against the
exact bytes retained in Git.

| Local file | Repository provenance | SHA-256 |
| --- | --- | --- |
| `../../sample-images/DSCF4042.RAF` | Maintainer fixture, commit `f4238b45d0242725155951e9240fd2672a65bb07` | `2887212a48dfe5291fd88e73ea76a4edb53716c8f09131bc2af309dab6e83064` |
| `../../sample-images/P1020180.RW2` | Maintainer fixture, commit `f4238b45d0242725155951e9240fd2672a65bb07` | `392db341d9eb4c03aaa5fb2c61b529fbf5edbaf4075f37ac83e6f385e2e69cdd` |
