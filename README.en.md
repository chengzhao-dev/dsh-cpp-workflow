# dsh-cpp-workflow

[中文](README.md)

Three skills for C++11–C++23 source, CMake, and build work; new projects default to C++23. The plugin registers a skill provider only; it does not register tools, compile, download a toolchain, or write project files.

## What it provides

| Skill | Covers | Open it when |
| --- | --- | --- |
| `developing-cpp` | Behavior, boundaries, declarations, implementation; naming, exceptions, and source comments in `.h` / `.cpp` / `.cc` | The user names source code, or the work is a new project or whole-stage refactor |
| `configuring-cmake` | Targets, modules, checks; CMakeLists.txt, `cmake/` functions and modules, target properties, C++11–C++23 standards, 2-space layout | The change touches CMake targets, standards, link boundaries, functions, or modules |
| `building-cpp` | Build setup, tool configuration, checks; Ninja, Clang config, build scripts, environment combinations, formatting, and static analysis | The change touches build commands, tool config, or the environment declaration, or the project is first connected to a build |

The exception material follows the C++ Core Guidelines' Error handling section and guides source and examples only during development; the plugin runtime never compiles or executes those rules. All three skills read the project skill `cpp-workflow-project` first. Without it, the workspace gate never exposes these names.

## Install

Pinned npm install:

```bash
dsh plugin --profile web add npm:@chengzhao-dev/dsh-cpp-workflow@0.0.1
```

The matching Git tag:

```bash
dsh plugin --profile web add github:chengzhao-dev/dsh-cpp-workflow#v0.0.1
```

The desktop app owns the `desktop` profile. If the command-line `add` is rejected, add the plugin in the app settings and use the same pinned npm version. A Git tag install uses the prebuilt `lib/` committed in the repository and runs no build on the target machine; the package has no install script that needs approval.

### Settings

The plugin page's "C++ Workflow" card is the only entry point and manages file-header tags only: `@file` is always the file name, `@brief` is written by default, and `@author`, `@date`, `@copyright`, `@version` stay off and are written only when they hold a non-empty value; `@param`, `@return`, `@throws` are required by default. The preview follows the switches, saving takes effect on the next skill read, and existing sources are never rewritten. Settings navigation no longer duplicates the form.

## Workspace gate

Only one condition must hold before either skill appears: walking up from the current directory to the Git root, the path contains `.agents/skills/cpp-workflow-project/SKILL.md`.

The project skill marker is the repository's opt-in declaration. The plugin no longer requires a first-party `CMakeLists.txt` or C++ source file in the same repository: a docs-only repository, a repository that only copied the template, or a repository with no source files yet still matches; with an empty environment axis, the four source steps still work but build setup stops. Without the marker the list is empty, even when the repository contains CMake or `.cpp` files. Scan limits and boundary cases are in [docs/plugin-boundaries.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/plugin-boundaries.md).

The packaged skills use rank 550. A project `.agents/skills` skill uses rank 200 and overrides a plugin skill with the same name; do not copy `developing-cpp`, `configuring-cmake`, or `building-cpp` into a project.

## Project conventions

Copy [templates/cpp-workflow-project](templates/cpp-workflow-project) into the target repository's `.agents/skills/` directory, keeping the `cpp-workflow-project` directory name. Add only files that do not exist; do not overwrite existing source, `CMakeLists.txt`, or `.clang-*` files. The project skill records only facts that cannot be inferred from the source:

- project and component names, source root;
- library/program boundary and public header location;
- an entry command that runs from the repository root;
- stage-table path and terminology additions.

Keep one `environment.json` per repository. Its first three environment axes are intentionally empty in the template and must be filled with the project's real combination after copying; `standard` defaults to `c++23` and may be changed to `c++11`–`c++23`. While the axes are empty, the four source steps still work, but build setup stops. The stage table records observable behavior, not internal refactors.

## Environment combinations

| Axis | Values | Meaning |
| --- | --- | --- |
| `host` | `windows`, `linux`, `macos` | Where the editor and agent shell run |
| `build_host` | `native`, `wsl` | `wsl` is valid only with `host=windows` |
| `compiler` | `clang`, `gcc` | One compiler per configuration |
| `standard` | `c++11`, `c++14`, `c++17`, `c++20`, `c++23` | New projects default to `c++23`; one standard per project |

The standard lives in `environment.json` as `standard` and must match the CMake target and compile database; on the CMake side, prefer `configuring-cmake`'s `CompileSettings_SetCxxStandard` function. New projects default to C++23; for C++11–C++20, lower `standard`, `cxx_std_*`, `CXX_STANDARD`, and the `.clang-format` parsing level together, not one at a time. Per-standard facilities, tooling, and downgrade tables are in the [standard directory](skills/building-cpp/references/standards/README.md); the CMake two-layer declaration is in [cxx-standard.md](skills/configuring-cmake/references/cxx-standard.md).

The generator is always Ninja. Build directories are `build/clang/` and `build/gcc/`; they are never shared. Analysis tools are always `clang-format`, `clang-tidy`, and `clangd`; GCC mode does not switch to another analyzer.

Run the declaration check first, then the live check on the build host. `<skill-dir>` is the installed `building-cpp` directory, not a directory in the target project:

```bash
node "<skill-dir>/scripts/checking-environment.mjs" --project .
node "<skill-dir>/scripts/checking-environment.mjs" --project . --live
```

`windows + native` is not a valid combination in this version: the declaration check returns `ok: false` with the single issue `本版本不能在 Windows 原生壳里构建`. Stop there; do not add a PowerShell script or work around it by editing the declaration. The checker never installs, downloads, or edits PATH.

The project root carries only `.vscode/extensions.json` and `settings.json`: clangd (editing, completion, formatting), CMake Tools (the single configure/build/run/debug entry point), and the C/C++ extension (debug backend for CMake quick debugging only). There is no `tasks.json` or `launch.json`, so there is no second build or launch path. On Windows, open the project root through Remote - WSL; select the launch target in the CMake sidebar and run `CMake: Debug`. clangd reads the language standard from `build/<compiler>/compile_commands.json`; do not put `-std` in `.clangd`. The C/C++ extension's IntelliSense is disabled so editing and diagnostics come only from clangd.

## Package layout

```text
dsh-cpp-workflow/
├── lib/                 # build output, shipped in the npm package
├── skills/              # developing-cpp, configuring-cmake, and building-cpp
├── templates/           # empty project template to copy
├── package.json
├── package-lock.json    # repository only, used by npm ci
├── LICENSE
├── README.md
├── README.en.md
├── cordis.patch.yml     # one insert row
├── locale/              # Chinese and English title/description
└── icon.svg
```

The repository also keeps `src/`, `scripts/`, `tests/` and `docs/` for development and review; they are not published. The whitelist lives in [docs/plugin-layout.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/plugin-layout.md).

Maintenance notes: flow and gate in [docs/plugin-flow.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/plugin-flow.md), skill layers and data flow in [docs/architecture.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/architecture.md), trigger matrix in [docs/triggering.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/triggering.md), directory and npm whitelist in [docs/plugin-layout.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/plugin-layout.md), version rules in [docs/versioning.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/versioning.md).

## Local development

Requires Node.js 22 or newer.

```bash
npm ci
npm test              # build, three-skill structural check, gate/environment/schema/comment tests
npm run test:matrix   # real build matrix: 4 templates x 5 standards
npm run pack:check    # inspect the npm package contents
npm run ci            # replay the Ubuntu CI job: install, test, package check
npm run ci:full       # ci plus the standard matrix; needs a POSIX host
```

Source lives in `src/`; `npm run build` writes `lib/`. The structural check is `scripts/checking-skill-links.mjs`. Tests do not invoke a local compiler; the environment checks use fixed version strings. The standard matrix needs `cmake`, `ninja`, `perl`, and `clang++` (or the compiler named by `CXX`) on a POSIX host such as WSL, Linux, or macOS. On Windows, run `npm run ci` first, then run `npm run ci:full` from WSL inside the checkout.

## License

MIT, see [LICENSE](LICENSE).
