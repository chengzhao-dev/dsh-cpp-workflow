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

npm 上还没有这个包时，`npm trust github` 会返回 404：trusted publishing 只能登记到已经存在的包。先用暂存发布创建包记录，不要在本机直接发布 0.1.0：

```bash
npm stage publish --access public
npm stage list
```

`npm stage publish` 不需要 2FA，会创建一个不可安装的 `0.0.0-stage` 占位包，并把当前版本放进暂存区。如果 `npm stage list` 里出现 0.1.0，先用 `npm stage reject <stage-id>` 拒绝它；同一个版本不能同时存在暂存记录和正式发布。列表为空时，只留下占位包，0.1.0 仍然可发。

然后登记 trusted publisher：

```bash
npm trust github @chengzhao-dev/dsh-cpp-workflow --repository chengzhao-dev/dsh-cpp-workflow --file publish.yml --allow-publish
```

`npm trust` 和 `npm stage reject` 需要 2FA。登记完成后，推送 `v0.1.0` 标签，由 `publish.yml` 发布带 provenance 的 0.1.0。

如果暂存发布也不可用，才使用本机引导：`npm publish --access public --no-provenance`。本机没有 OIDC，`publishConfig.provenance` 会让普通 `npm publish` 报 `EUSAGE`，所以必须显式关闭。这样发布的 0.1.0 没有 provenance，版本已经消耗，不能再推同号标签重发。
