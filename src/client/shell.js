'use strict'

// 客户端半侧：插件页的配置卡片（plugins.bundle.config），只此一个入口。
// 标签策略在本文件上方内联（由 scripts/building-client.mjs 从 src/comment-policy.js
// 拼进来），所以预览、默认值与服务端快照永远同源；这里只做表单与外观。
const React = require('react')
const h = React.createElement

const PACKAGE_NAME = '@chengzhao-dev/dsh-cpp-workflow'
