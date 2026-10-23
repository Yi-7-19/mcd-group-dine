# 第三方代码说明

页面动效使用 Remotion **4.0.534** 原包的 `interpolate`、`Easing` 及其数学辅助模块。源代码入口为完整仓库的 `motion/page-motion.mjs`，构建脚本为 `scripts/build-motion.mjs`。Remotion 公共入口还会初始化完整渲染器，构建时使用固定版本包内的原始辅助模块生成轻量脚本，未重写其算法。没有引入 React 或播放器运行时。

这些模块保留自身许可，不属于本项目 MIT 许可的再授权范围。原文见 [Remotion 许可](remotion-LICENSE.md)。Remotion 的 Easing 和 Bezier 实现注明源自 React Native，另附该来源提交的 [MIT 许可](react-native-LICENSE.txt)。两份原文也保留在输出 HTML 的动效脚本注释中，单个账单复制出去后仍包含说明。

- Remotion 官方文档：https://www.remotion.dev/docs/interpolate 、https://www.remotion.dev/docs/easing
- Remotion 源码：https://github.com/remotion-dev/remotion
- React Native 原始辅助代码：https://github.com/react/react-native/tree/0b9ea60b4fee8cacc36e7160e31b91fc114dbc0d/Libraries/Animated/src

`esbuild` 仅用于开发时打包；终端用户运行 Skill 和打开账单无需安装它。项目内的食物图片由内置图像模型生成，详见 `assets/food/README.md`，并非第三方品牌摄影。
