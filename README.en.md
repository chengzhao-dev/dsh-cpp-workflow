# dsh-cpp-workflow

[中文](README.md)

Two skills for C++20 source work and build work. The plugin registers a skill provider only; it does not register tools, compile, download a toolchain, or write project files.

## What it provides

| Skill | Covers | Open it when |
| --- | --- | --- |
| `developing-cpp` | Behavior, boundaries, declarations, implementation; naming, exceptions, and source comments in `.h` / `.cpp` | The user names source code, or the work is a new project or whole-stage refactor |
| `building-cpp` | Build setup, tool configuration, checks; CMake, Ninja, Clang config, build scripts, and environment combinations | The change touches build files, tool config, or the environment declaration, or the project is first connected to a build |

Both skills read the project skill `cpp-workflow-project` first. Without it, the workspace gate never exposes these names.

## Install

Pinned npm install:

```bash
dsh plugin --profile web add npm:@chengzhao-dev/dsh-cpp-workflow@0.1.1
```

The matching Git tag:

```bash
dsh plugin --profile web add github:chengzhao-dev/dsh-cpp-workflow#v0.1.1
```

The desktop app owns the `desktop` profile. If the command-line `add` is rejected, add the plugin in the app settings and use the same pinned npm version. A Git tag install uses the prebuilt `lib/` committed in the repository and runs no build on the target machine; the package has no install script that needs approval.

## Workspace gate

Both conditions must hold before either skill appears:

1. Walking up from the current directory to the Git root, the path contains `.agents/skills/cpp-workflow-project/SKILL.md`.
2. Inside the same Git repository that owns the marker, outside the skipped directories, there is a first-party `CMakeLists.txt`, or a `.c`, `.cc`, `.cpp`, `.cxx`, `.h`, `.hh`, `.hpp`, or `.hxx` source file.

If either condition fails, the list is empty: without the project skill, CMake or `.cpp` files alone do not match; with the project skill but no first-party CMake or C++ source file in the repository, the result is also empty. A docs-only repository or one that only copied the template does not match. Scan limits, skipped directories, and the eight boundary cases are in [docs/plugin-boundaries.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/plugin-boundaries.md).

The packaged skills use rank 550. A project `.agents/skills` skill uses rank 200 and overrides a plugin skill with the same name; do not copy `developing-cpp` or `building-cpp` into a project.

## Project conventions

Copy [templates/cpp-workflow-project](templates/cpp-workflow-project) into the target repository's `.agents/skills/` directory, keeping the `cpp-workflow-project` directory name. Add only files that do not exist; do not overwrite existing source, `CMakeLists.txt`, or `.clang-*` files. The project skill records only facts that cannot be inferred from the source:

- project and component names, source root;
- library/program boundary and public header location;
- an entry command that runs from the repository root;
- stage-table path and terminology additions.

Keep one `environment.json` per repository. Its three axes are intentionally empty in the template and must be filled with the project's real combination after copying; while empty, the four source steps still work, but build setup stops. The stage table records observable behavior, not internal refactors.

## Environment combinations

| Axis | Values | Meaning |
| --- | --- | --- |
| `host` | `windows`, `linux`, `macos` | Where the editor and agent shell run |
| `build_host` | `native`, `wsl` | `wsl` is valid only with `host=windows` |
| `compiler` | `clang`, `gcc` | One compiler per configuration |

The generator is always Ninja. Build directories are `build/clang/` and `build/gcc/`; they are never shared. Analysis tools are always `clang-format`, `clang-tidy`, and `clangd`; GCC mode does not switch to another analyzer.

Run the declaration check first, then the live check on the build host. `<skill-dir>` is the installed `building-cpp` directory, not a directory in the target project:

```bash
node "<skill-dir>/scripts/checking-environment.mjs" --project .
node "<skill-dir>/scripts/checking-environment.mjs" --project . --live
```

`windows + native` is a valid combination, but this version ships no PowerShell build script; `--live` reports the missing POSIX shell, not a missing compiler. The checker never installs, downloads, or edits PATH.

## Package layout

```text
dsh-cpp-workflow/
├── lib/                 # build output, shipped in the npm package
├── skills/              # developing-cpp and building-cpp
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

Maintenance notes: flow and gate in [docs/plugin-flow.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/plugin-flow.md), directory and npm whitelist in [docs/plugin-layout.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/plugin-layout.md), version rules in [docs/versioning.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/versioning.md).

## Local development

Requires Node.js 22 or newer.

```bash
npm ci
npm test           # build, structural check, gate/environment/schema tests
npm run pack:check # inspect the npm package contents
```

Source lives in `src/`; `npm run build` writes `lib/`. The structural check is `scripts/checking-skill-links.mjs`. Tests do not invoke a local compiler; the environment checks use fixed version strings.

## License

MIT, see [LICENSE](LICENSE).
