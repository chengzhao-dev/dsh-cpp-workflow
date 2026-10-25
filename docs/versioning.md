# 版本规则

发布版本以 `package.json` 为唯一来源；`package-lock.json` 的两个版本字段跟随它，不单独改。当前是 0.3.x。

## 修订号：0.3.x

只改措辞、文档、示例、注释、测试或内部实现，不改变技能名、步骤数、脚本参数、门禁条件和检查结果。已有工程升级后不应出现新的失败。

## 次版本：0.x.0

会改变使用方式的改动走次版本：

- 增加、删除或重命名技能；
- 改 `steps/` 的编号或完成判据；
- 改 `checking-environment.mjs` 的参数、退出码或版本要求；
- 新增会让旧工程失败的检查；
- 改门禁条件、rank 或项目模板的必填项。

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

从 `0.1.1` 起，版本只由标签触发的 `publish.yml` 发布，并带 provenance。`0.1.0` 不重发，也不为了重跑它改版本号。

## 发布流程

1. 改 `package.json` 与 `package-lock.json` 的版本，提交并推送 `main`。
2. 等 `ci` 在 `main` 上通过。
3. 在要发布的那个提交上打 annotated 标签，推送标签：

   ```bash
   git tag -a v0.3.1 -m "v0.3.1"
   git push origin v0.3.1
   ```

4. `publish.yml` 校验标签与 `package.json` 同号，跑 `npm ci` 和 `npm test`，再 `npm publish`。`publishConfig.provenance` 打开 provenance。
5. 发布成功后，同一个 workflow 用 `gh release create --verify-tag --generate-notes` 建 GitHub Release。
6. 读回两边的 commit，必须相同：

   ```bash
   npm view @chengzhao-dev/dsh-cpp-workflow@0.3.1 version gitHead
   git rev-parse v0.3.1^{commit}
   ```

   `npm view @chengzhao-dev/dsh-cpp-workflow@0.3.1 dist.attestations` 应能看到 provenance 记录。

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
