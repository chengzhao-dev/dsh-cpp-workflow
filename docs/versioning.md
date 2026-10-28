# 版本规则

发布版本以 `package.json` 为唯一来源；`package-lock.json` 的两个版本字段跟随它，不单独改。

## 当前版本

`dsh-cpp-workflow` 为 **0.6.6**，`dsh-quarto-book` 为 **0.6.16**。两个插件各自在上一条发布线（0.6.4 / 0.6.14）上做补丁递增，不再共用版本号。误发的 `0.0.1` 已从 npm 撤回，并删除 GitHub 标签与 Release；该号作废，不再复用。

## 修订号

只改措辞、文档、示例、注释、测试、内部实现或检查词表时，补丁号加一：`0.6.5` 之后是 `0.6.6`，`0.6.15` 之后是 `0.6.16`。新检查让旧工程报出新问题，也只加补丁号。

## 次版本

增加、删除或重命名技能，改 `steps/` 的编号或完成判据，改 `checking-environment.mjs` 的参数、退出码或版本要求，改门禁条件、rank 或项目模板的必填项时发次版本：两个插件都从 `0.7.0` 起。

## 主版本

只有明确宣布契约稳定、并愿意为后续破坏性改动承担主版本号时才发 `1.0.0`；当前没有这个计划。

## 兼容窗口

`engines.dsh` 只在要支持的 DSH 版本窗口变化时改，与上面几档无关。

## 发布流程

1. 改 `package.json` 与 `package-lock.json` 的版本，提交并推送 `main`。
2. `ci` 与 `publish.yml` 都会在 `main` 上运行。`publish.yml` 读 `package.json` 的版本，再查 npm：版本不存在，就 `npm ci`、`npm test`、`npm publish --provenance`；版本已存在，就跳过发布。测试失败时整条发布链停在发布前。
3. 发布成功后，同一个 workflow 在同一个提交上建 annotated 标签 `v<版本>`，再用 `gh release create --verify-tag --generate-notes` 建 GitHub Release。标签已存在就复用，不重复创建。
4. 需要手动补发时，也可以推送 `v<版本>` 标签；workflow 发现 npm 上已有同版本时只补 Release。
5. 读回两边的 commit，必须相同：

   ```bash
   npm view @chengzhao-dev/dsh-cpp-workflow@0.6.6 version gitHead
   git rev-parse v0.6.6^{commit}
   ```

   `npm view ... dist.attestations` 应能看到 provenance 记录。

## 标签约束

- annotated 标签与 `package.json` 同号，例如 `v0.6.6`。
- 标签打在发布提交上；标签之后再补文档提交，会让 npm 的 `gitHead` 与标签指向的 commit 不一致。
- 同一个版本不重复发布，也不把版本改回旧号重推同一个标签。
- 版本还没进 registry 时，修好问题后可以删除本地与远端标签，重打在修正后的提交上；版本一旦可安装，只升版本号。
- `v0.0.1` 已删除且不再重建；误发版本的撤回不通过重发同号完成，而是走新的补丁号。

## 首次发布已完成

`0.1.0` 之前用 `npm stage publish` 建过包记录，trusted publisher 已登记到本仓库的 `publish.yml`；这些引导步骤不再需要。`npm trust` 与 `npm stage` 需要 2FA，只在重新登记或排障时使用。
