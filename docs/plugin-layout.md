# 包布局

这个包只发布白名单里的文件；目录树与逐文件清单见 [module-layout.md](module-layout.md)。分层与加载顺序见 [architecture.md](architecture.md)，触发判据见 [triggering.md](triggering.md)。

## 进包白名单

`package.json` 的 `files` 字段：

```json
[
  "lib",
  "skills",
  "cordis.patch.yml",
  "locale",
  "icon.svg",
  "README.md",
  "README.en.md",
  "LICENSE",
  "templates"
]
```

`lib/` 是构建产物，源码在 `src/`；`docs/`、`tests/`、`scripts/` 与 `temp/` 不进包。安装后仍按 `skills/<name>/SKILL.md` 发现技能。
