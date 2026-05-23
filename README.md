# TOB 客户诊断与方案生成 Agent

这是一个面向售前团队的 Web 端管理平台原型，用于收集客户信息、上传并描述项目材料、运行客户诊断，并基于诊断结果生成可迭代的 PPT 解决方案框架。

## 已实现能力

- 客户名称录入后自动识别行业、地区、企业属性、上市状态等客户画像标签
- Word / PPT / PDF / Excel 等材料上传入口与逐份材料描述
- 运行客户诊断时展示材料整理、大模型材料分析、关键词抽取、综合诊断进度
- 可配置材料分析大模型 Agent，将客户信息、材料描述和上传文件提交给模型服务进行结构化分析
- 基于客户信息、大模型材料洞察、售前整体判断生成客户诊断
- 诊断维度覆盖核心问题速览、重点标签、材料洞察、建设背景、诉求痛点、需求场景、关键证据、潜在风险、推进策略
- PPT 方案生成页，覆盖项目背景、需求痛点、项目目标、解决方案、计划目标、资源投入
- PPT 方案生成页会根据客户材料、诊断结果、用户关键信息和勾选的 Knowhow 参考材料动态生成多章节多页面框架
- 每一页 PPT 下方展示章节写作思路，说明为什么这样写，用户可输入综合调整意见让 Agent 反复完善
- 可调用 PPT 生成工具输出正式 `.pptx` 文件：默认使用浏览器端 PPTX 工具，也可切换为后端 PPT 生成服务
- Knowhow 平台 API 配置、检索请求组装、推荐结果展示和不可用时降级模拟
- 诊断后输出 TOP 10 最匹配客户案例、业务场景、参考材料，支持在线预览材料和勾选作为本次方案生成依据
- 适合直接部署到 GitHub Pages 的纯静态结构

## 文件结构

```text
.
├── index.html
├── styles.css
├── app.js
└── README.md
```

## 本地预览

直接在浏览器打开 `index.html` 即可使用。

也可以启动一个本地静态服务：

```bash
python3 -m http.server 8080
```

然后访问：

```text
http://localhost:8080
```

## 后续接入建议

当前版本不再在浏览器里用 `FileReader` 或本地脚本直接解析上传文件正文。运行客户诊断时，前端会优先调用配置页中的“材料分析大模型 Agent 接口”，把客户信息、材料描述和上传文件以 `multipart/form-data` 发送给模型服务；如果未配置该接口，页面会明确提示“未配置大模型 Agent”，并仅按材料描述生成临时诊断，不会声称已充分阅读文件正文。

生产化时建议拆成后端服务：

- 材料分析大模型 Agent：读取 Word、PPT、PDF、Excel 内容，结合客户信息输出结构化材料洞察
- 大模型诊断服务：输入客户信息、材料洞察、售前判断，输出诊断 JSON
- 方案生成服务：基于诊断结果、Knowhow 检索结果、参考材料内容和用户反馈生成 PPT 结构
- PPT 生成工具：将结构化方案转换为公司标准模板 `.pptx`
- Knowhow 检索服务：按行业、需求场景、痛点关键词召回历史方案与案例

## 材料分析 Agent 接口建议

配置页中的“材料分析大模型 Agent 接口”建议接收：

```text
POST /api/material/analyze
Content-Type: multipart/form-data
Authorization: Bearer {optional_api_key}
```

表单字段：

- `payload`：客户信息、材料元数据、分析提示词和期望 JSON schema
- `files`：用户上传的 Word / PPT / PDF / Excel / CSV / TXT 等材料文件

建议返回 JSON：

```json
{
  "summary": "客户材料整体洞察",
  "keywords": ["经营分析", "数据治理"],
  "scenarios": ["经营分析会", "资产运营"],
  "pains": ["痛点或诉求"],
  "risks": ["潜在风险"],
  "evidence": ["可引用材料证据"],
  "materials": [
    {
      "id": "材料 id",
      "summary": "逐份材料摘要",
      "keywords": ["关键词"],
      "scenarios": ["需求场景"],
      "evidence": ["证据"]
    }
  ]
}
```

## PPT 生成工具

方案页中的“调用 PPT 生成工具”会输出正式 `.pptx`：

- 默认：使用浏览器端 PPTX 工具生成文件，适合 GitHub Pages 直接访问。
- 后端服务：在配置页将 PPT 生成方式切换为“后端 PPT 生成服务”，并填写接口地址。服务建议接收客户信息、诊断结果、材料分析结果、方案框架和选中的 Knowhow 参考材料，返回 `.pptx` 文件流、`download_url` 或 base64。

## Knowhow API 对接

飞书文档中可读到的接口信息已接入配置页：

- Base URL：`https://digitchat.fanruan.com/dataset/`
- 检索接口：`POST api/v1/retrieve`
- 鉴权方式：`Authorization: Bearer {api_key}`
- 请求字段：`query`、`retrieval_model`、`metadata_filters`
- 主要过滤：`industry`、`tags`、`quality`、`node_path`
- 推荐结果建议返回：`customer`、`scenario`、`title`、`score`、`preview_url`。前端也兼容 `url`、`link` 作为在线预览材料地址。

前端会用客户名称、AI 识别出的客户画像标签、诊断出的需求场景和痛点关键词生成检索 query。默认采用宽松召回，不加元数据过滤；如果选择严格过滤且返回为空，会自动回退到宽松召回。若未填写 API Key，或浏览器因跨域/网络策略无法直连接口，会自动显示模拟推荐；生产化建议由后端代理调用 Knowhow API，避免 API Key 暴露和 CORS 限制。

配置成功的判断：

- 配置页填写 `Knowhow API Base URL` 和 `API Key`。
- 点击 `测试推荐`。
- 连接诊断显示“连接成功，已从 Knowhow API 召回 N 条推荐”。

如果诊断显示浏览器无法直接调用，通常不是前端逻辑问题，而是静态页面直连接口被 CORS 或网络策略拦截。生产环境需要通过后端代理调用 Knowhow API，或让 Knowhow API 允许部署域名跨域访问。

GitHub Pages 是纯静态站点，若 Knowhow API 未允许 `https://simonlvpin.github.io` 跨域访问，请在平台配置里将请求模式切换为 `后端代理转发`，并填写代理接口地址。代理接口应将请求转发到：

```text
POST https://digitchat.fanruan.com/dataset/api/v1/retrieve
Authorization: Bearer {api_key}
```

## GitHub Pages 部署

1. 创建 GitHub 仓库。
2. 上传本目录下的全部文件。
3. 在仓库 Settings -> Pages 中选择部署分支。
4. 保存后等待 GitHub Pages 生成访问地址。
