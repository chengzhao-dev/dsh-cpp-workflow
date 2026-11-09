# dsh-cpp-workflow

[中文](README.md)

Three skills for C++11–C++23 source, CMake, and build work; new projects default to C++23. The plugin registers a skill provider and a settings form; it does not register tools, compile, download a toolchain, or write project files; it keeps no runtime cache and writes no temporary files, and the host persists settings.

## What it provides

| Skill | Covers | Open it when |
| --- | --- | --- |
| `developing-cpp` | Behavior, boundaries, declarations, implementation; naming, exceptions, and source comments in `.h` / `.cpp` / `.cc` | The user names source code, or the work is a new project or whole-stage refactor |
| `engineering` | Targets, modules, checks; CMakeLists.txt, `cmake/` functions and modules, target properties, C++11–C++23 standards, and configuration rules for `.clang-format`/`.clang-tidy`/`.clangd` | The change touches CMake targets, standards, link boundaries, functions, modules, or encoding and clang tooling configuration |
| `building-cpp` | Build setup, tool configuration, checks; Ninja, Clang config, build scripts, environment combinations, formatting configuration, and static analysis | The change touches build commands, tool configuration, or the environment declaration, or the project is first connected to a build |

The exception material follows the C++ Core Guidelines' Error handling section and guides source and examples only during development; the plugin runtime never compiles or executes those rules. All three skills read the project skill `cpp-workflow-project` first. Without it, the workspace gate never lists these skills.

## Install

Fixed-version npm install:

```bash
dsh plugin --profile <profile> add npm:@chengzhao-dev/dsh-cpp-workflow@0.7.1
```

The latest published version is `0.7.1`; `0.7.4` exists only in the working tree and is not published yet, so use `0.7.1` above until it is released. `0.7.3` is skipped and will not be published. After the working-tree version is published, switch the npm command to:

```bash
dsh plugin --profile <profile> add npm:@chengzhao-dev/dsh-cpp-workflow@0.7.4
```

GitHub tag installs require the matching tag; once `v0.7.4` is created, the version in the address matches the tag:

```bash
dsh plugin --profile <profile> add github:chengzhao-dev/dsh-cpp-workflow#v0.7.4
```

Replace `--profile` with the profile you actually run. The desktop app always runs the `desktop` profile, and that profile is owned by the app; if the command-line `add` is rejected, add the plugin in the app settings and use the same pinned npm version. A Git tag install uses the prebuilt `lib/` committed in the repository and runs no build on the target machine; the package has no install script that needs approval.

### Settings

The plugin page's "C++ Workflow" card is the only entry point and manages the comment symbol and file-header tags: the symbol is `///` or `/** ... */`, `@file` is always the file name, and every file-header, type, and declaration tag is on by default except the fixed `//` body symbol; empty values are skipped. `@param` is required for every parameter; `@return` may be omitted when the condition is self-evident; `@throws` only when the function throws; `@pre`, `@post`, `@retval`, `@tparam`, `@note`, and `@see` are on by default and can be switched off individually. The preview follows the switches, saving takes effect on the next skill read, and existing sources are never rewritten. The plugin page no longer duplicates navigation.

If the page still reports that it is not connected to a configuration form after an upgrade, the window is still running the previous client bundle: restart DeepSeek Harness or select "Reload page" on the plugin page. The page retries the connection while open and switches to the editable form as soon as the host serves it; reinstalling is unnecessary. After a successful save, the status line shows the written `~/.dsh/profiles/<profile>/cordis.patch.yml`. Discard changes, Restore defaults and Save are separate: discard returns to the last value read from the host, restore fills the draft, and only Save writes it.

## Workspace gate

Only one condition must hold before any of the three skills appears: walking up from the current directory to the Git root, the path contains `.agents/skills/cpp-workflow-project/SKILL.md`.

The project skill marker is the repository's opt-in declaration. The plugin no longer requires a first-party `CMakeLists.txt` or C++ source file in the same repository: a docs-only repository, a repository that only copied the template, or a repository with no source files yet still matches; with an empty environment axis, the four source steps still work but build setup stops. Without the marker the list is empty, even when the repository contains CMake or `.cpp` files. Scan limits and boundary cases are in [docs/plugin-boundaries.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/plugin-boundaries.md).

The packaged skills use rank 550. A project `.agents/skills` skill uses rank 200 and a user-level skill uses rank 500; both override a plugin skill with the same name, so do not copy `developing-cpp`, `engineering`, or `building-cpp` into either location.

## Project conventions

Copy [templates/cpp-workflow-project](templates/cpp-workflow-project) into the target repository's `.agents/skills/` directory, keeping the `cpp-workflow-project` directory name. Add only files that do not exist; do not overwrite existing source, `CMakeLists.txt`, or `.clang-*` files. The project skill records project-specific facts; the template's "common workflow conventions" carry the shared workflow, editor, and completion rules, so the project skill does not repeat them:

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

The standard lives in `environment.json` as `standard` and must match the CMake target and compile database; on the CMake side, prefer `engineering`'s `CompileSettings_SetCxxStandard` function. New projects default to C++23; for C++11–C++20, lower `standard`, `cxx_std_*`, `CXX_STANDARD`, and the `.clang-format` parsing level together, not one at a time. Per-standard facilities, tooling, and downgrade tables are in the [standard directory](skills/engineering/references/cmake/standards/index.md); the CMake two-layer declaration is in [01-cxx-standard.md](skills/engineering/references/cmake/standards/01-cxx-standard.md).

The generator is always Ninja. Build directories are `build/clang/` and `build/gcc/`; they are never shared. Analysis tools are always `clang-format`, `clang-tidy`, and `clangd`; GCC mode does not switch to another analyzer.

Run the declaration check first, then the live check on the build host. `<skill-dir>` is the installed `building-cpp` directory, not a directory in the target project:

```bash
node "<skill-dir>/scripts/checking-environment.mjs" --project .
node "<skill-dir>/scripts/checking-environment.mjs" --project . --live
```

`windows + native` is not a valid combination in this version: the declaration check returns `ok: false` with the single issue `本版本不能在 Windows 原生壳里构建`. Stop there; do not add a PowerShell script or work around it by editing the declaration. The checker never installs, downloads, or edits PATH.

The project root carries only `.vscode/extensions.json` and `settings.json`: clangd (editing, completion, formatting), CMake Tools (the single configure/build/run/debug entry point), and the C/C++ extension (debug backend for CMake quick debugging only). There is no `tasks.json` or `launch.json`, so there is no second build or launch path. On Windows, open the project root through Remote - WSL; select the launch target in the CMake sidebar and run `CMake: Debug`. clangd reads the language standard from `build/<compiler>/compile_commands.json`; do not put `-std` in `.clangd`. The C/C++ extension's IntelliSense is disabled so editing and diagnostics come only from clangd.

## Package layout

The runtime closure is `lib/`, `skills/`, `templates/`, `locale/`, `cordis.patch.yml`, both READMEs, `LICENSE`, and `icon.svg`. The repository also keeps `src/`, `scripts/`, `tests/`, and `docs/` for development and review; they are not published. The authoritative whitelist and per-directory map live in [docs/plugin-layout.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/plugin-layout.md).

Maintenance notes: flow and gate in [docs/plugin-flow.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/plugin-flow.md), skill layers and data flow in [docs/architecture.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/architecture.md), trigger matrix in [docs/triggering.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/triggering.md), directory and npm whitelist in [docs/plugin-layout.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/plugin-layout.md), runtime disk and cache boundaries in [docs/plugin-storage.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/plugin-storage.md), design principles in [docs/design-principles.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/design-principles.md), comment and naming source-research process in [docs/comment-sources.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/comment-sources.md), version rules in [docs/versioning.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/versioning.md).

## Local development

Requires Node.js 22 or newer.

```bash
npm ci
npm test              # main pre-commit gate: build, structural/encoding/workflow checks, and unit tests
npm run test:matrix   # real build matrix: 4 templates x 5 standards
npm run pack:check    # inspect the npm package contents
npm run ci            # replay the Ubuntu CI job: install, test, package check
npm run ci:full       # ci plus the standard matrix; needs a POSIX host
```

Source lives in `src/`; `npm run build` writes `lib/`. The structural check is `scripts/checking-skill-links.mjs`. Tests do not invoke a local compiler; the environment checks use fixed version strings. The standard matrix needs `cmake`, `ninja`, `perl`, and `clang++` (or the compiler named by `CXX`) on a POSIX host such as WSL, Linux, or macOS. On Windows, run `npm run ci` first, then run `npm run ci:full` from WSL inside the checkout.

## License

MIT, see [LICENSE](LICENSE).
