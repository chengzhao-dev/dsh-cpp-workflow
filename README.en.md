# dsh-cpp-workflow

**English** | [简体中文](README.md)

C++20 workflow skills for [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/). Work moves through seven steps: behavior → boundary → declaration → implementation → build → tooling → checks. Source rules follow the Google C++ Style Guide with documented deviations; builds use CMake + Ninja; message composition uses `std::format`.

The plugin registers skills only. It does not register tools, scan projects, install toolchains, or rewrite project files. Project facts live in the target repository at `.agents/skills/cpp-workflow-project/`; generic rules stay in the plugin.

## What it provides

| Skill | Steps | Owns | Does not own |
| --- | --- | --- | --- |
| `developing-cpp` | 1–4 | observable behavior, library/app boundary, headers and declarations, naming, exceptions, source comments, `.cpp` implementation | CMake, `.clang-*`, build scripts, docs, Python |
| `building-cpp` | 5–7 | CMake targets, Ninja, compile database, clang-format/tidy/clangd, environment-axis checks, build script | source semantics, naming, exception bodies |

Skills are discovered from `skills/<name>/SKILL.md`. Step files, references, examples and assets are resolved relative to each skill directory.

## Install

```bash
dsh plugin --profile web add npm:dsh-cpp-workflow@0.1.0
```

Replace `--profile` with the profile you actually run. For the desktop app's `desktop` profile, use Settings → Plugins → Add plugin and enter `npm:dsh-cpp-workflow@0.1.0`; do not run command-line `add` against an app-managed profile. A GitHub tag also works: `github:<owner>/dsh-cpp-workflow#v0.1.0`, but pin a commit or tag and make sure `lib/` is committed.

Requires DSH 0.2.x and Node.js 22+. The published package ships compiled `lib/`; no build is needed after install. Git installs need a `prepare` script or prebuilt `lib/`, and this repository commits `lib/`.

## Workspace gate

`apply()` only registers a skill provider; it never scans, probes or writes files. `list({ cwd })` returns the two skills only when:

- a nearest git root can be found by walking up from `cwd`;
- `.agents/skills/cpp-workflow-project/SKILL.md` exists between `cwd` and that git root.

No `cwd`, no git checkout, or a marker above the git root yields an empty list. The gate affects discovery only; `get()` still serves already-loaded candidates. Project `.agents/skills` has rank 200 and the plugin has rank 550, so a project skill with the same name wins. Do not embed `developing-cpp` or `building-cpp` in a project; it would shadow the plugin and fork the generic rules.

## The seven steps

| Step | Name | Output | File |
| --- | --- | --- | --- |
| 1 | Behavior | one acceptance sentence | `skills/developing-cpp/steps/01-behavior.md` |
| 2 | Boundary | library/app responsibilities and dependency direction | `skills/developing-cpp/steps/02-boundary.md` |
| 3 | Declaration | headers, naming, declaration order, contracts | `skills/developing-cpp/steps/03-declaration.md` |
| 4 | Implementation | `.cpp` operation order, grouping, implementation comments | `skills/developing-cpp/steps/04-implementation.md` |
| 5 | Build | target-based CMake, Ninja, compile database | `skills/building-cpp/steps/05-build.md` |
| 6 | Tooling | clang-format/tidy/clangd, editor settings | `skills/building-cpp/steps/06-tooling.md` |
| 7 | Checks | live environment, project entry command, CTest, run | `skills/building-cpp/steps/07-check.md` |

If a later step finds an earlier one incomplete, return to the broken step instead of patching the current layer. Step 5 runs the static environment check; step 7 runs `--live` before the project entry command to verify the build host, PATH roles, versions and a real `std::format` probe.

## Project skill

```text
<repo>/.agents/skills/cpp-workflow-project/
├── SKILL.md                  # project name, entry command, boundary, stage table
├── environment.json          # host / build_host / compiler, all empty
└── stages/stage-table.md     # observable behavior, verification, status
```

Copy `templates/cpp-workflow-project/` and fill in real facts. The three axes are intentionally empty; the plugin never guesses WSL, Clang or a build directory. Keep domain terms, input formats and external constraints here; do not copy Google style, CMake rules or clang-tidy lists into the project skill.

## Environment axes

| Axis | Values | Meaning |
| --- | --- | --- |
| `host` | `windows` / `linux` / `macos` | OS the project actually runs on |
| `build_host` | `native` / `wsl` | `wsl` is valid only with `host=windows`; Linux/macOS must use `native` |
| `compiler` | `clang` / `gcc` | one compiler per configure; Ninja is the only generator |

Valid: Windows + WSL + clang/gcc, Linux + native + clang/gcc, macOS + native + clang/gcc. Windows + native is a valid declaration, but this version ships no PowerShell build script; `--live` reports the missing shell, not a missing compiler. Build directories are `build/clang` and `build/gcc`; `build/compile_commands.json` points at the current database.

```bash
node skills/building-cpp/scripts/checking-environment.mjs --project <repo>
node skills/building-cpp/scripts/checking-environment.mjs --project <repo> --live
node skills/building-cpp/scripts/checking-environment.mjs --project <repo> --json
```

Exit codes: `0` pass, `1` internal script error, `2` declaration missing or invalid, `3` live check failed. The checker is read-only; its only temporary write is a `std::format` probe under the OS temp directory, removed before exit.

## Toolchain requirements

- **C++20**, no C++23; `std::print` is unavailable, so use `std::cout` / `std::cerr` with `std::format`.
- **CMake ≥ 3.20**, **Ninja**, **CTest**.
- **Clang mode**: `clang++`, `clang-format`, `clang-tidy`, `clangd` share one LLVM major version and are all ≥ 16.
- **GCC mode**: `g++ ≥ 13` (libstdc++ `<format>`), clang-format/clang-tidy ≥ 16, and clangd only needs to be available. Formatting and static analysis stay on the Clang toolchain regardless of the compiler.
- `std::format` also needs real standard-library support: GCC/libstdc++ ≥ 13 or libc++ ≥ 14. The checker compiles and runs a probe instead of trusting version numbers.
- `--query-driver` is a clangd command-line argument, not a `.clangd` YAML key. It lives in `.vscode/settings.json`; when switching compilers, confirm and update the absolute path.

## Assets and templates

`skills/building-cpp/assets/` contains scaffolding sources:

- `config/`: `.clang-format`, `.clang-tidy`, `.clangd`, `.vscode/`.
- `cmake/`: shared warnings, pinned GoogleTest, cross-platform `BUILD_RPATH`.
- `templates/projects/`: `single`, `multi`, `static-library`, `shared-library`, plus `common/running-build.sh`. All use target-based CMake, `cxx_std_20`, an `app` executable and a separate library target.

Copy only missing files; never overwrite existing `CMakeLists.txt`, `.clang-*`, `.vscode` or sources. Copy CMake helper modules into the project's `cmake/` and include them after setting `CMAKE_MODULE_PATH`; do not include directly from the plugin directory.

`running-build.sh <clang|gcc>` performs: unconditional configure → build → compile-database symlink → CRLF check → clang-format → clang-tidy (`.cpp` only) → CTest → run `app` from `build/<compiler>/bin`.

## Package layout

```text
dsh-cpp-workflow/
├── src/index.ts              # provider and gate
├── lib/index.js              # tsc output, shipped
├── skills/                   # two skills and assets
├── templates/                # project-skill template
├── docs/                     # references, layout, validation
├── scripts/                  # structural self-check
├── locale/{zh,en}.json
├── cordis.patch.yml          # inserts one cpp-workflow row
└── icon.svg
```

See `docs/cpp-workflow-layout.md` for layering and copy rules, and `docs/cpp-workflow-validation.md` plus `docs/creation-references.md` for sources, Google deviations and the cpp-board-games audit.

## Local development

```bash
npm install
npm run build      # tsc → lib/
npm test           # provider + checker, no local C++ toolchain
npm run check      # build + structure/links/shell/template/package + the same sample tests
npm run pack:check # npm pack --dry-run
```

`npm run check` is the full self-check from the plan: build `lib/`, verify skill links and package metadata, then run the provider and checker sample tests in `tests/`. Tests use temporary directories for `.git` and project markers, and never write to a real repository. Template compilation is not simulated by Node tests; it belongs to the declared build host's acceptance run.

## Design baseline

- DSH skill subsystem and publishing docs: bundle patch, `SkillProvider` `list()`/`get()`, ranks, `engines.dsh`, `files` whitelist.
- Google C++ Style Guide: C++20 baseline, naming, declaration order, exceptions, include order, casts and ownership.
- `cpp-board-games` C++ teaching conventions: Google naming and declaration order, exception layering, comment layers, target-based CMake, build-script stage order.
- Structural references: `dsh-quarto-book` and `dsh-embedded-workbench`. The download snapshot has no C++-specific top plugin, so this package follows generic bundle conventions instead of inventing a runtime protocol.

Documented deviations: exceptions only at contract violations/program boundaries (Google bans exceptions); `#pragma once` (Google uses include guards); 100 columns (Google 80); `Get` + PascalCase accessors; `.h/.cpp` extensions; project headers included by bare filename from a component `PUBLIC include/`; clang-format/tidy instead of `cpplint.py`; closed status enums may specify `std::uint8_t`. The full table is in `skills/developing-cpp/references/google-cpp-style.md`.

## Non-goals

- Does not modify repositories outside the current project; this round's audit did not change `cpp-board-games`.
- No MSVC/clang-cl, C-only, debugger, ASan, vcpkg/Conan, or Debug/Release axis.
- No tool installation, dependency download, PATH edits, or `~/.bashrc` changes.
- No tool registration and no environment probing inside `apply()`; checks happen only when the checker is invoked.
- No LSP client or code-navigation service; the package only guarantees a `compile_commands.json` for the current build, and navigation stays with an existing clangd/LSP plugin.
- No PowerShell entry for Windows native builds; that is a documented v1 gap, not an implicit fallback.

## License

MIT, see [LICENSE](LICENSE).
