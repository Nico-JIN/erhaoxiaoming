# 样式问题排查指南

## 问题：页面没有样式显示

### 已启动服务器
- ✅ 开发服务器已通过 `test-server.bat` 启动
- ✅ 预览服务器也已启动（用于测试生产版本）

### 立即检查步骤

## 第1步：检查开发服务器地址

请查看弹出的命令窗口，找到类似这样的输出：
```
VITE v6.4.1  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: http://192.168.x.x:3000/
```

**在浏览器中打开显示的地址**（可能是3000、3001、3002等端口）

---

## 第2步：打开浏览器开发者工具（必须！）

按 **F12** 打开开发者工具，然后执行以下检查：

### A. 检查Network（网络）标签

1. 切换到 **Network** 标签
2. 刷新页面（按 **Ctrl+F5** 强制刷新）
3. 查找以下文件，确认它们的状态码：

| 文件 | 应该看到 | 如果失败 |
|------|----------|----------|
| `index.css` 或 `src/index.css` | ✅ 200 OK | 检查文件路径 |
| `/fonts/fonts.css` | ✅ 200 OK | 检查public目录 |
| `/fonts/inter-400.ttf` | ✅ 200 OK | 检查字体文件 |

**如果看到404错误**：
- 记下具体请求的路径
- 截图发给我

### B. 检查Console（控制台）标签

1. 切换到 **Console** 标签
2. 查看是否有红色错误信息
3. 特别注意这些错误：
   - `Failed to load resource` 
   - `Module not found`
   - CSS相关错误

**如果有错误**：
- 复制完整的错误信息
- 发给我

### C. 检查Elements（元素）标签

1. 切换到 **Elements** 标签
2. 在HTML中找到 `<head>` 标签
3. 确认是否有以下内容：

#### 开发模式应该看到：
```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lemind Knowledge</title>
  <link href="/fonts/fonts.css" rel="stylesheet">
  <style type="text/css">
    /* 应该有Vite注入的样式 */
  </style>
</head>
```

#### 检查body样式
4. 在Elements标签中，选中 `<body>` 元素
5. 在右侧的 **Styles** 面板中，查看是否有：
```css
body {
    font-family: 'Inter', sans-serif;
    background-color: #f8fafc;
}
```

**如果没有看到这些样式**：
- 说明CSS没有加载
- 请检查Console是否有错误

---

## 第3步：测试生产版本

如果开发服务器有问题，测试生产构建：

1. 找到预览服务器的地址（通常是 `http://localhost:4173/`）
2. 在浏览器中打开
3. 重复第2步的检查

生产版本的HTML应该有：
```html
<link rel="stylesheet" crossorigin href="/assets/index-oJQmKYRK.css">
```

---

## 常见问题和解决方案

### 问题1：CSS文件404
**原因**：文件路径不正确
**解决**：
```bash
# 停止服务器，运行：
cd D:\workplace\erhaoxiaoming
ls index.css  # 确认文件存在
npm run dev   # 重启服务器
```

### 问题2：字体无法加载
**原因**：public目录配置问题
**解决**：
```bash
cd D:\workplace\erhaoxiaoming
ls public\fonts\*.ttf  # 确认字体文件存在
```

### 问题3：Vite HMR连接失败
**症状**：Console显示WebSocket连接错误
**解决**：
```bash
# 清除Vite缓存并重启
rmdir /s /q node_modules\.vite
npm run dev
```

### 问题4：浏览器缓存
**解决**：
- 按 **Ctrl+Shift+Delete** 打开清除浏览器数据
- 选择"缓存的图像和文件"
- 清除后重新访问

### 问题5：PostCSS插件错误
**症状**：Console显示PostCSS或Tailwind错误
**解决**：
```bash
# 重新安装依赖
npm install
npm run dev
```

---

## 快速诊断命令

在浏览器Console中运行这些命令：

```javascript
// 检查CSS是否加载
console.log('Styles:', document.styleSheets.length);
console.log('Body bg:', getComputedStyle(document.body).backgroundColor);
console.log('Body font:', getComputedStyle(document.body).fontFamily);

// 检查Tailwind类是否生效
const testDiv = document.createElement('div');
testDiv.className = 'bg-blue-500 text-white p-4';
document.body.appendChild(testDiv);
testDiv.textContent = '如果这个框是蓝色的，Tailwind正常工作';
```

---

## 发送诊断信息给我

如果以上都不能解决问题，请提供：

1. **浏览器Console截图**（包含所有错误）
2. **Network标签截图**（显示CSS文件的加载状态）
3. **开发服务器命令窗口的输出**
4. **执行以下命令的输出**：

```bash
cd D:\workplace\erhaoxiaoming
ls index.css
ls public\fonts\
Get-Content index.html
```

---

## 临时解决方案：使用生产构建

如果开发服务器始终有问题，可以使用生产构建：

```bash
cd D:\workplace\erhaoxiaoming
npm run build
npm run preview
```

然后访问 `http://localhost:4173/`

---

## 重要提示

❗ **不要关闭开发服务器的命令窗口**
- 服务器需要持续运行才能访问页面
- 错误信息会在这个窗口中显示

❗ **确保后端服务器也在运行**
- 前端：`http://localhost:3000/` 左右
- 后端：`http://localhost:8000/`

❗ **使用正确的浏览器**
- 推荐使用Chrome或Edge（最新版本）
- Firefox也可以
- 避免使用IE浏览器

---

## 下一步

按照上面的步骤检查后，告诉我：
1. 浏览器Console中有什么错误？
2. Network标签中哪些文件加载失败？
3. 页面背景色是什么颜色？（应该是浅灰色）
4. 有任何样式显示吗？（即使部分也可以）

我会根据您的反馈进一步诊断问题！
