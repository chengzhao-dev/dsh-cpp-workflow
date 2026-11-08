# 运行时存储

本页回答插件在磁盘上留下什么、这些内容由谁清理，以及改动时靠哪条守卫拦住回退。

## 结论

插件运行时不写盘、不建缓存目录，也没有常驻定时器或后台进程。`list()` 只读包内的 `skills/<name>/SKILL.md` 与项目里的标记文件，`get()` 每次重读正文；设置由宿主保存，插件自己不落盘。`npm pack --dry-run` 实测 180 个文件、包约 218 kB、解包约 590 kB，包内没有运行时生成物。

## 守卫

`tests/storage.test.mjs` 锁两条不变量：

- 静态扫描 `src/` 与 `lib/`：`node:fs` 只允许 `access`、`lstat`、`readFile`、`readdir`、`stat` 五个只读导入；出现 `writeFile`、`appendFile`、`createWriteStream`、`mkdir`、`rm`、`unlink`、`rename`、`copyFile`、`setInterval`、`setTimeout`、`localStorage`、`sessionStorage`、`indexedDB` 或 `caches` 就失败。
- 运行时快照：在临时工作区连续 20 次 `list()` + `get()`，文件集合、大小与 `mtime` 必须与调用前完全一致。

维护规则：新增能力如果确实需要写盘，必须先具备属主、lease、字节预算与可重试的清理入口；四样缺一就不合并。缓存不是禁止项，但「没有登记、没有上限、没有回收」的缓存是。

## 与 dsh-ops 0.5.0 的对照

dsh-ops issue [#714](https://github.com/T-Auto/dsh-ops/issues/714) 记录的是另一类问题：Windows 每次 Niubash 调用都把约 786 MiB 的完整执行树复制到临时目录，正常 `finally` 会清理，崩溃、强退或删除失败时遗留，约 13–14 份就到 10 GiB 量级；结果缓存与 spill 还有跨会话无总预算的增长路径，对应 issue [#723](https://github.com/T-Auto/dsh-ops/issues/723) 与 PR [#729](https://github.com/T-Auto/dsh-ops/pull/729)、[#730](https://github.com/T-Auto/dsh-ops/pull/730)。

本插件没有按调用复制的运行时、没有结果缓存，也没有后台 sweep，因此不存在同一机制。本机曾有的 `~/.dsh/dsh-ops` 1.1 GB 是 dsh-ops 0.4.4 留下的三份旧 `bash-ipc` 运行时副本，属于宿主侧缓存，已由 `dsh-ops uninstall --yes` 清理；它不由本包写入，也不由本包清理。

## 复核

`npm test` 会跑静态扫描与运行时快照；`npm run pack:check` 复核包体，`scripts/checking-standard-matrix.sh` 复核 20 组标准矩阵。若包体或单次调用体积明显变化，先更新本页与 `tests/storage.test.mjs` 的预算，再决定是否接受这次增长。
