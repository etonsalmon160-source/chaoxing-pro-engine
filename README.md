<div align="center">

# 🎓 Chaoxing Pro Engine (超星学习通 Pro 挂机与智能答题引擎)

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=for-the-badge&logo=googlechrome)
![License MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![AI Powered](https://img.shields.io/badge/AI-DeepSeek_|_GPT--4o_|_Gemini_|_Claude-purple?style=for-the-badge&logo=openai)
![Design Theme](https://img.shields.io/badge/Theme-Deep_Navy_Blue-060D20?style=for-the-badge)

**专为超星学习通打造的高性能、智能化、双控制终端网课自动化与 AI 智能答题 Chrome 扩展插件。**

[功能特性](#-功能特性) • [安装教程](#-安装教程) • [AI 模型配置](#-ai-模型配置) • [科研支持与开源致赏](#-科研支持与开源致赏) • [免责声明](#-免责声明)

---

</div>

## 🌟 项目简介

**Chaoxing Pro Engine** 是一款采用 Chrome Extension Manifest V3 标准构建的现代化网课辅助工具。针对超星学习通复杂的 `iframe` 架构、答题检测以及防挂机机制进行了底层深度重构。

助手采用了 **“双控制终端联动”** 设计：
- **左侧小窗 (HUD Widget)**：直接悬浮挂载于学习通网页左侧，实时显示进度、倍速与控制按键。
- **右侧大窗 (Big Window Dashboard)**：支持一键放大为全屏独立 Dashboard 面板，内置日志终端、配置面板与 AI 模型拉取器。

---

## 🔥 功能特性

### 1. 🎬 极速倍速与无感静音播放
- **原型链 Hook 劫持**：挂载底层 `HTMLVideoElement.prototype`，突破前端倍速限制，支持 1.0x ~ 16.0x 任意倍速调节。
- **防卡死 Watchdog 看门狗**：自动检测浏览器无手势播放限制，自动对播放器画布派发模拟点击，彻底解决“视频卡死在 00:00”或无限等待排队的问题。

### 2. 🛡️ 智能连续章节跳转引擎 (消除死锁)
- **4.5 秒动态超时锁**：摒弃传统硬编码 15 秒硬锁定，改用智能动态时间戳与页面 Hash / DOM 变动重置算法。
- **超星全套目录树兼容**：完美识别并连跳连续“暂无内容”阅读页、纯文本页或 0 任务点章节，流畅不卡顿。

### 3. 🧠 2025/2026 前沿 AI 大模型在线自动识别
- **最新前沿模型支持**：内置 DeepSeek-V3/R1、GPT-4o、o3-mini、o1、Gemini 2.0 Flash、Claude 3.7 Sonnet、硅基流动 (SiliconFlow) 与通义千问 (Qwen) 等。
- **`🔄 自动识别模型`**：点击按钮即可自动向后端 `/v1/models` 端点请求，在线抓取当前 API Key 或中转站下实际支持的最新可用模型列表！

### 4. 💻 双控制终端无缝同步
- 数据通过 `chrome.storage` 与 `runtime.sendMessage` 双向打通，无论是从小窗还是大窗开启/暂停引擎，状态与运行日志均实时同步。

---

## 🛠️ 安装教程

1. **获取源码**：
   ```bash
   git clone https://github.com/etonsalmon160-source/chaoxing-pro-engine.git
   ```
   *或直接下载页面上的 ZIP 压缩包并解压至本地目录。*

2. **加载扩展程序**：
   - 打开 Chrome 浏览器，在地址栏输入：`chrome://extensions/`
   - 开启右上角的 **“开发者模式” (Developer mode)**。
   - 点击左上角的 **“加载已解压的扩展程序” (Load unpacked)**。
   - 选择本项目所在根目录 (`学习通插件`) 即可成功安装。

3. **开始使用**：
   - 打开超星学习通课程页面，左侧将自动唤醒悬浮 HUD 小窗。
   - 点击浏览器右上角插件图标，可开启右侧大窗面板进行 API Key 配置与日志监控。

---

## ⚙️ AI 模型配置说明

在插件面板的 **“智能答题”** 选项卡中：
1. 选择您的 AI 接口厂商（如 DeepSeek、OpenAI、Gemini、Claude、硅基流动、通义千问或自定义 OneAPI）。
2. 输入您的 API Key。
3. 点击 **`🔄 自动识别模型`** 按钮，系统将自动连接接口并拉取账户可用的模型列表，供您一键选择！

---

## ☕ 科研支持与开源致赏 (半公益性质)

> ### 📢 开源致谢与科研资金说明
>
> 本项目为 **完全免费且无任何功能限制的开源项目**，绝无任何强制收费、付费解锁或VIP专享功能。
> 
> **“开源制作不易，您的每一笔资金都将用于生物学研究。”**
>
> 如果本助手在学习通网课中为您节省了宝贵的时间，欢迎自由赞赏支持作者（完全自愿，赞赏与否均享受完整无缝的功能体验）！您的每一份善意都是支持作者继续投入生物学科研与开源维护的巨大动力！

<div align="center">

<img src="assets/sponsor.jpg" width="240" alt="ETO1024's Tip Code 赞赏码" style="border-radius: 18px; padding: 8px; background: #ffffff; box-shadow: 0 8px 24px rgba(0,0,0,0.35);" />

**微信 / 赞赏码：`ETO1024's Tip Code`**

</div>

---

## 📧 联系与反馈

- **开发者邮箱**：[etonsalmon160@gmail.com](mailto:etonsalmon160@gmail.com)
- **GitHub 仓库**：[etonsalmon160-source/chaoxing-pro-engine](https://github.com/etonsalmon160-source/chaoxing-pro-engine)

---

## 📄 免责声明

本插件仅供个人学习、技术研究与自动化测试使用。请合理安排网课学习计划，尊重课程版权与教学规则。开发者不对因不当使用本工具所导致的任何后果承担责任。

<div align="center">

Made with ❤️ & Bio-Research Passion by **EtonsAlmon**

</div>
