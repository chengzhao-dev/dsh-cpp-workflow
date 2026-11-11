# 版本规则

发布版本以 `package.json` 为唯一来源；`package-lock.json` 的两个版本字段跟随它，不单独改。

## 当前版本

工作区 `dsh-cpp-workflow` 为 **0.7.5**（尚未发布；**0.7.3**、**0.7.4** 跳过），npm 最新发布是 **0.7.1**；`dsh-quarto-book` 为 **0.6.25**。两个插件各自发布，不再共用版本号。误发的 `0.0.1` 已从 npm 撤回，并删除 GitHub 标签与 Release；该号作废，不再复用。

## 修订号

只改措辞、文档、示例、注释、测试、内部实现或检查词表时，补丁号加一：从 `0.7.5` 到 `0.7.6`，再到 `0.7.7`。新检查让旧工程报出新问题，也只加补丁号。

## 次版本

增加、删除或重命名技能，改 `steps/` 的编号或完成判据，改 `checking-environment.mjs` 的参数、退出码或版本要求，改门禁条件、rank 或项目模板的必填项时发次版本：两个插件都从 `0.7.0` 起。

## 主版本

只有明确宣布契约稳定、并愿意为后续破坏性改动承担主版本号时才发 `1.0.0`；当前没有这个计划。

## 兼容窗口

`engines.dsh`、`peerDependencies` 与 `devDependencies` 里的 `@deepseek-ai/dsh-skill` 用同一个窗口，只在要支持的 DSH 版本变化时改，与上面几档无关。

当前窗口是 `>=0.2.1-rc.1 <0.3.0-0`，对应宿主 0.2.1-rc.5。semver 只允许比较器里出现过同一 `major.minor.patch` 的预发布号命中该 tuple 的预发布版本，所以这个范围覆盖 0.2.1 的 rc 与正式版，但不覆盖将来 0.2.2 的 rc；DSH 的安装器目前不强制 `engines.dsh`，窗口随宿主版本更新时三处一起调整。

## 发布流程

1. 改 `package.json` 与 `package-lock.json` 的版本，提交并推送 `main`。
2. `ci` 与 `publish.yml` 都会在 `main` 上运行。`publish.yml` 读 `package.json` 的版本，再查 npm：版本不存在，就 `npm ci`、`npm test`、`npm publish --tag latest`（provenance 由 `publishConfig.provenance=true` 提供）；版本已存在，就跳过发布。测试失败时整条发布链停在发布前。
3. 发布成功后，同一个 workflow 在同一个提交上建 annotated 标签 `v<版本>`，再用 `gh release create --verify-tag --generate-notes` 建 GitHub Release。标签已存在就复用，不重复创建。
4. 需要手动补发时，也可以推送 `v<版本>` 标签；workflow 发现 npm 上已有同版本时只补 Release。`workflow_dispatch` 只在 `main` 或 `v*` 标签上执行，其他 ref 直接跳过。
5. 读回两边的 commit，必须相同：

   ```bash
   npm view @chengzhao-dev/dsh-cpp-workflow@0.7.5 version gitHead
   git rev-parse v0.7.5^{commit}
   ```

   `npm view ... dist.attestations` 应能看到 provenance 记录。

## 变更记录

发布说明由 `gh release create --generate-notes` 从提交生成，GitHub Release 就是本包唯一的变更记录。不另建 `CHANGELOG.md`：同一段历史只留一份出处，避免发布时两处描述打架。

## 标签约束

- annotated 标签与 `package.json` 同号，例如 `v0.7.1`。
- 标签打在发布提交上；标签之后再补文档提交，会让 npm 的 `gitHead` 与标签指向的 commit 不一致。
- 同一个版本不重复发布，也不把版本改回旧号重推同一个标签。
- 版本还没进 registry 时，修好问题后可以删除本地与远端标签，重打在修正后的提交上；版本一旦可安装，只升版本号。
- `v0.0.1` 已删除且不再重建；误发版本的撤回不通过重发同号完成，而是走新的补丁号。

## 首次发布已完成

`0.1.0` 之前用 `npm stage publish` 建过包记录，trusted publisher 已登记到本仓库的 `publish.yml`；这些引导步骤不再需要。`npm trust` 与 `npm stage` 需要 2FA，只在重新登记或排障时使用。
