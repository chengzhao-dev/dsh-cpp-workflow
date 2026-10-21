# 版本规则

首版是 `0.1.0`。0.x 阶段按三档处理，发布版本以 `package.json` 为准，`package-lock.json` 的两个版本字段随之更新。

## 修订号：0.1.x

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

## 标签与发布

- annotated 标签与 `package.json` 同号，例如 `v0.1.0`。
- 同一个版本不重复发布，也不把版本改回旧号重推同一个标签。
- `publish.yml` 只在 `v*` 标签上运行；发布前 `npm test` 必须全绿。
- 发布后核对 `npm view @chengzhao-dev/dsh-cpp-workflow@<version> version` 和 tarball 内容。

## 首次发布引导

npm 上还没有这个包时，`npm trust github` 会返回 404：trusted publishing 只能登记到已经存在的包。先在本机做一次首发引导：

```bash
npm publish --access public --no-provenance
```

`publishConfig.provenance` 在没有 OIDC 的本机发布会报 `EUSAGE`，所以引导时必须显式关闭 provenance。完成 2FA 后，再执行：

```bash
npm trust github @chengzhao-dev/dsh-cpp-workflow --repository chengzhao-dev/dsh-cpp-workflow --file publish.yml --allow-publish
```

引导已经发布了 0.1.0；再推 `v0.1.0` 标签时，`publish.yml` 会因为版本已存在而失败。这次失败不算 0.1.0 发布失败：0.1.0 以本机引导的结果为准，后续版本只走标签和 trusted publishing。不要为了重跑 0.1.0 改版本号或重复发同号。
