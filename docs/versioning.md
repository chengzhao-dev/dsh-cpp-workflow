# 版本规则

发布版本以 `package.json` 为唯一来源；`package-lock.json` 的两个版本字段跟随它，不单独改。当前是 0.6.x。

## 修订号：0.6.x

只改措辞、文档、示例、注释、测试、内部实现或检查词表。新检查或提示让旧工程报出新问题，也只加修订号；已有工程升级后可能看到新诊断，但不需要改工程结构。

## 次版本：0.x.0

会改变使用方式的改动走次版本：

- 增加、删除或重命名技能；
- 改 `steps/` 的编号或完成判据；
- 改 `checking-environment.mjs` 的参数、退出码或版本要求；
- 改门禁条件、rank 或项目模板的必填项。

平时只加修订号 `0.0.1`；只有架构、布局这类很大的结构调整，才升到 `0.x.0`。

0.x 阶段不因为“破坏兼容”而发 1.0.0；破坏兼容仍然只升次版本。

## 主版本：1.0.0

只有明确宣布契约稳定、并愿意为后续破坏性改动承担主版本号时才发。当前没有这个计划。

## 已发布版本

| 版本 | 发布方式 | provenance | 说明 |
| --- | --- | --- | --- |
| `0.1.0` | 本机 `npm publish --no-provenance` | 无 | npm 上的首个版本。`v0.1.0` 标签只作提交标记，对应的 publish run 因版本已存在而失败。 |
| `0.1.1` | 标签触发的 `publish.yml` | 有 | 统一 Google 风格与异常条文，修复 Windows 原生声明。 |
| `0.2.0` | 标签触发的 `publish.yml` | 有 | 对齐 C++23 默认标准、补充构建与检查矩阵，修正模板文档。 |
| `0.3.0` | 标签触发的 `publish.yml` | 有 | 新增编码检查与谓词命名约定，补齐 C++ 注释与读者正文的边界。 |
| `0.3.1` | 标签触发的 `publish.yml` | 有 | 统一注释行宽与行宽口径、修正技能文档冲突，补齐注释检查器与架构文档。 |
| `0.5.0` | 随 `v0.5.0` 标签发布 | 有 | 新增 `configuring-cmake` 技能，把 CMake 从构建中拆出；新增无 `.rst` 的契约注释约定、`noexcept` 与 `at()` 的检查，以及井字棋同款 CMake 样板。 |
| `0.5.1` | 随 `v0.5.1` 标签发布 | 有 | 三个技能写入单次激活上限；把注释正反例拆成声明与实现两份；补边界、通用性与 token 的调研记录。 |
| `0.5.2` | 随 `v0.5.2` 标签发布 | 有 | 收紧注释句式：纯数据类型只写名词短语、谓词首句写「检查…是否…」、数据成员按需写行尾注释；删除 `CellAt`/`CellRef`，改用 `at()` 并去掉相应 `noexcept`；构建脚本收成配置编译、CTest、运行三步。 |
| `0.5.3` | 随 `v0.5.3` 标签发布 | 有 | 注释归位：文件头只写本文件，类数据成员改为上一行 `///`，实现按空行阶段写 `//`；`Board` 增加 `Clear`，测试增至 14 条；章节把实现解说移回源码。 |
| `0.5.4` | 随 `v0.5.4` 标签发布 | 有 | 插件流程加入 GitHub Actions 工作流结构检查；`npm test` 同时校验 npm 包与 workflow。 |
| `0.5.5` | 随 `v0.5.5` 标签发布 | 有 | 文件头改 Doxygen 风格：`/// @file` 与 `/// @brief` 两行，替换 `//===` 横幅；实现内注释统一为 `///`，检查器按新风格校验；示例中的“整盘清空”改为“清空棋盘”。 |
| `0.6.0` | 待随 `v0.6.0` 标签发布 | 有 | 新增浏览器半侧与设置页：文件头标签开关存进插件配置，设置页与技能快照共用同一份策略；检查器新增 `--no-brief`、`--allow-tag` 与 `@file` 文件名核对。 |

从 `0.1.1` 起，`publish.yml` 负责发布并带 provenance。现在它在 `main` 推送、`v*` 标签推送或手动触发时运行：`package.json` 的版本还没进 registry 就自动跑测试并发布，已经存在就跳过发布、只补 GitHub Release。`0.1.0` 不重发，也不为了重跑它改版本号。

## 发布流程

1. 改 `package.json` 与 `package-lock.json` 的版本，提交并推送 `main`。
2. `ci` 与 `publish.yml` 都会在 `main` 上运行。`publish.yml` 读 `package.json` 的版本，再查 npm：版本不存在，就 `npm ci`、`npm test`、`npm publish`；版本已存在，就跳过发布。测试失败时整条发布链停在发布前。
3. 发布成功后，同一个 workflow 在同一个提交上建 annotated 标签 `v<版本>`，再用 `gh release create --verify-tag --generate-notes` 建 GitHub Release。标签已存在就复用，不重复创建。
4. 需要手动补发时，也可以推送 `v<版本>` 标签；workflow 发现 npm 上已有同版本时只补 Release。
5. 读回两边的 commit，必须相同：

   ```bash
   npm view @chengzhao-dev/dsh-cpp-workflow@0.5.4 version gitHead
   git rev-parse v0.5.4^{commit}
   ```

   `npm view @chengzhao-dev/dsh-cpp-workflow@0.5.4 dist.attestations` 应能看到 provenance 记录。

## 标签约束

- annotated 标签与 `package.json` 同号，例如 `v0.3.1`。
- 标签打在发布提交上。标签之后再补文档提交，会让 npm 的 `gitHead` 与标签指向的 commit 不一致；`0.1.0` 就差了这样一个只改 `docs/versioning.md` 的提交。
- 同一个版本不重复发布，也不把版本改回旧号重推同一个标签。
- 版本还没进 registry 时，修好问题后可以删除本地与远端标签，重打在修正后的提交上；版本一旦可安装，只升版本号。

## 首次发布已完成

`0.1.0` 之前用 `npm stage publish` 建了包记录（`0.0.0-stage` 占位）。按 `0.1.0` 的 publish run 表现，trusted publisher 已登记到本仓库的 `publish.yml`：失败点是版本已存在，不是认证错误，说明 OIDC 已能被 registry 接受。

这些引导步骤不再需要。`npm trust` 与 `npm stage` 需要 2FA，只在重新登记或排障时使用。如果 `0.1.1` 的 run 报 401/404，再登记一次：

```bash
npm trust github @chengzhao-dev/dsh-cpp-workflow --repository chengzhao-dev/dsh-cpp-workflow --file publish.yml --allow-publish
```
