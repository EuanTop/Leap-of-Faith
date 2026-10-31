<h1 align="center">倒悬鬼屋 · Upside Down</h1>
<p align="center">All Hallows’ Eve.</p>
<p align="center"><a href="README.md">English</a> · <strong>简体中文</strong></p>
<p align="center"><img src="docs/preview.webp" width="420" alt="倒悬建筑、门洞中的幽灵和水面上的小黄鸭"></p>

建筑倒悬在静水之上，幽灵从门洞注视游过的小黄鸭，倒影连接两个空间。作者 **@EuanTop**。

当前为视觉开发版，尚未导出这一版的完整成片。

### 启动

需要 Node 22.12+。

```sh
npm ci
npm run dev
```

访问 `http://127.0.0.1:5175/`。右侧面板与 [本机控制接口](docs/control.md) 共用参数。默认 **3:4**，场景周期 **28.8 秒**；音乐首次播放需要浏览器交互。

### 实现

- 参数化悬挂塔楼、凹入拱门、曲廊与南瓜吊灯。
- 真实平面倒影、克制的周期 GLSL 扰动与保留历史位置的游动尾迹。
- 连续布面幽灵包含转头、轻摆和眨眼；小黄鸭采用程序化造型与游动。
- 沿用上一作的鸭子、布面构建方法、光照方法和原创合成配乐，重新搭建空间构图。
- 字体本地化，几何由代码生成。当前场景位于 `src/inverted/`，源码保留此前的实验模块。

```sh
npm run build
npm test
```

检查包括曲廊面朝向、水面净空、游动模型设置与循环连续性。媒体、浏览器缓存和生成产物放在 Git 忽略的 `artifacts/`。本机预览不会发布或上传文件。

源码：[MIT](LICENSE)。Goudy Bookletter 1911：[SIL OFL](public/fonts/OFL.txt)。
