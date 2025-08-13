# note-data
一个 GitHub 私有仓库用来存放 Markdown 文档

- `pnpm new` 创建新文章，传入语言参数，如 `pnpm new zh` 创建中文文章，`pnpm new en` 创建英文文章
- `pnpm time` 更新修改文件的时间戳
- `pnpm convert` 转换文件名
- `pnpm commit` 提交到 Git
- `pnpm push` 修改时间戳，转换文件名，提交并推送到远程仓库
- `insertIdToMd.cjs` 用于给大量的初始化文章添加 id 字段（避免了给大量的文档手动添加 id 字段）

如果你的新文章没有 id 字段，可以使用 `pnpm initId` 来给大量的初始化文章添加 id 字段（避免了给大量的文档手动添加 id 字段），对于已经有 id 字段的文档，则不会进行修改。

没有的ID的文档在转换文件名时会自动添加 ID 字段，但是都是随机生成的，每次运行都不一样，所以最好手动添加。

每次写完文章后，可以使用 `pnpm push` 一键完成一些列操作。

`deploy.yml` 文件中可以配置每当推送后就触发构建（Webhook），也可以手动触发构建。


