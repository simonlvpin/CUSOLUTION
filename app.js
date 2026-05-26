const defaultSettings = {
  knowhowUrl: "https://digitchat.fanruan.com/dataset/",
  knowhowAuth: "API Token",
  knowhowRequestMode: "direct",
  knowhowProxyUrl: "",
  knowhowApiKey: "",
  businessDomain: "project",
  datasets: "both",
  topK: 20,
  filterStrategy: "loose",
  industryField: "industry",
  scenarioField: "tags",
  qualityFilter: "",
  nodePathFilter: "",
  llmBaseUrl: "https://it-ai.fineres.com/v1",
  llmModel: "deepseek-v4-pro",
  llmApiKey: "",
  customerTagAgentUrl: "",
  customerTagAgentApiKey: "",
  customerTagAgentPrompt:
    "请根据客户名称和上下文识别企业画像，必须输出 JSON。请至少包含：company_name（公司主体）、industry（行业）、region（地区）、ownership（央国企/地方国企/民企/上市公司主体属性）、market_status（上市/非上市/待核验）、business_tags（业务标签）、technology_tags（技术标签）、market_tags（市场标签）、aliases（企业别名）、confidence（0-1）、reason（识别依据）。如果能确认运营主体，请不要只返回“待确认”。如果某项不确定，请明确写待核验，但不要用它代替整体识别结果。",
  materialAgentUrl: "",
  materialAgentApiKey: "",
  materialAgentPrompt:
    "请充分阅读上传材料，输出客户项目建设背景、重点诉求、痛点目标、需求场景、风险挑战、关键词、逐份材料摘要和可引用证据。请返回 JSON，字段可包含 summary、keywords、scenarios、pains、risks、evidence、materials。",
  pptToolMode: "browser",
  pptToolUrl: "",
  pptToolApiKey: "",
  pptToolTemplate: "",
  knowhowRule:
    "根据客户名称、AI 识别出的行业标签、地区标签、企业属性、需求场景和痛点关键词，调用 POST api/v1/retrieve，召回公司历史客户、场景案例、PPT 解决方案和最佳实践，再由大模型提炼可复用方案结构。",
};

function mergeSettings(...sources) {
  return sources.reduce((merged, source) => {
    Object.entries(source || {}).forEach(([key, value]) => {
      if (value === "" && merged[key]) return;
      if (value === undefined || value === null) return;
      merged[key] = value;
    });
    return merged;
  }, {});
}

const savedSettings = JSON.parse(localStorage.getItem("agentSettings") || "null") || {};
const runtimeSettings = window.CUSOLUTION_DEFAULT_CONFIG || {};

const state = {
  materials: [],
  diagnosis: null,
  proposal: null,
  versions: [],
  knowhowRefs: [],
  knowhowMode: "mock",
  selectedKnowhowIds: new Set(),
  customerTags: [],
  customerProfile: null,
  customerTagMode: "local",
  materialAnalysis: null,
  settings: mergeSettings(defaultSettings, runtimeSettings, savedSettings),
};

const scenarioLibrary = {
  制造业: ["经营分析会", "生产制造", "数据治理", "供应链协同", "质量追溯"],
  金融: ["财务分析", "风险合规", "经营分析", "客户经营", "监管报送"],
  零售消费: ["会员运营", "门店经营分析", "供应链补货", "营销投放", "财务分析"],
  房地产与城投: ["经营分析会", "资产运营", "工程项目管理", "财务分析", "数据治理"],
  能源化工: ["生产制造", "设备运维", "安全环保", "经营分析", "数据治理"],
  政企公共服务: ["综合治理", "绩效分析", "数据共享", "项目监管", "公共服务"],
  医药健康: ["质量合规", "研发管理", "供应链协同", "经营分析", "数据治理"],
  互联网科技: ["产品运营", "客户增长", "经营分析", "数据治理", "成本分析"],
};

const industrySolutionMap = {
  制造业: ["集团经营分析解决方案", "智能制造数据底座方案", "供应链计划协同方案"],
  金融: ["金融机构风险经营一体化方案", "监管报送数据治理方案", "客户价值经营方案"],
  零售消费: ["全域会员运营分析方案", "门店经营驾驶舱方案", "营销投放归因方案"],
  房地产与城投: ["地产集团经营分析方案", "城投集团资产运营方案", "工程项目经营驾驶舱方案"],
  能源化工: ["生产运营一体化管控方案", "设备预测性维护方案", "安全环保管理方案"],
  政企公共服务: ["政企数据共享交换方案", "绩效监管驾驶舱方案", "公共服务数字化方案"],
  医药健康: ["医药质量合规数据方案", "供应链追溯方案", "研发项目组合管理方案"],
  互联网科技: ["产品运营增长分析方案", "成本效率分析方案", "数据资产治理方案"],
};

const customerTagRules = [
  { category: "industry", label: "房地产与城投", words: ["地产", "置业", "城投", "房产", "建设集团", "开发集团"] },
  { category: "industry", label: "金融", words: ["银行", "证券", "保险", "基金", "信托", "金控"] },
  { category: "industry", label: "制造业", words: ["制造", "汽车", "装备", "电气", "工业", "机械"] },
  { category: "industry", label: "零售消费", words: ["零售", "商贸", "百货", "消费", "食品", "餐饮"] },
  { category: "industry", label: "能源化工", words: ["能源", "电力", "化工", "石化", "燃气", "煤"] },
  { category: "industry", label: "医药健康", words: ["医药", "医疗", "医院", "健康", "药业"] },
  { category: "industry", label: "互联网科技", words: ["科技", "软件", "信息", "网络", "数科"] },
  { category: "region", label: "上海", words: ["上海", "沪"] },
  { category: "region", label: "华东", words: ["华东", "江苏", "浙江", "安徽", "福建", "山东"] },
  { category: "region", label: "北京", words: ["北京", "京"] },
  { category: "region", label: "广东", words: ["广东", "广州", "深圳", "粤"] },
  { category: "ownership", label: "央国企", words: ["中核", "中建", "中铁", "国家", "中国", "央企"] },
  { category: "ownership", label: "地方国企", words: ["集团", "城投", "国资", "市政", "交通投资", "地产集团"] },
  { category: "ownership", label: "民营企业", words: ["股份", "控股", "实业", "民营"] },
  { category: "market", label: "上市公司待核验", words: ["股份", "上市", "控股"] },
  { category: "market", label: "非上市集团待核验", words: ["集团", "有限公司"] },
];

const dom = {
  navItems: document.querySelectorAll(".nav-item"),
  appShell: document.querySelector(".app-shell"),
  collapseSidebarBtn: document.querySelector("#collapseSidebarBtn"),
  views: document.querySelectorAll(".view"),
  pageTitle: document.querySelector("#pageTitle"),
  agentStatus: document.querySelector("#agentStatus"),
  customerName: document.querySelector("#customerName"),
  customerTagPanel: document.querySelector("#customerTagPanel"),
  customerTagQuality: document.querySelector("#customerTagQuality"),
  customerProfileSummary: document.querySelector("#customerProfileSummary"),
  projectStage: document.querySelector("#projectStage"),
  expectedOutput: document.querySelector("#expectedOutput"),
  fileInput: document.querySelector("#fileInput"),
  dropZone: document.querySelector("#dropZone"),
  addMaterialBtn: document.querySelector("#addMaterialBtn"),
  materialList: document.querySelector("#materialList"),
  overallNotes: document.querySelector("#overallNotes"),
  runDiagnosisBtn: document.querySelector("#runDiagnosisBtn"),
  loadSampleBtn: document.querySelector("#loadSampleBtn"),
  analysisProgress: document.querySelector("#analysisProgress"),
  progressTitle: document.querySelector("#progressTitle"),
  progressPercent: document.querySelector("#progressPercent"),
  progressFill: document.querySelector("#progressFill"),
  progressSteps: document.querySelector("#progressSteps"),
  diagnosisEmpty: document.querySelector("#diagnosisEmpty"),
  diagnosisResult: document.querySelector("#diagnosisResult"),
  coreIssueGrid: document.querySelector("#coreIssueGrid"),
  keywordTags: document.querySelector("#keywordTags"),
  materialInsightList: document.querySelector("#materialInsightList"),
  backgroundText: document.querySelector("#backgroundText"),
  painList: document.querySelector("#painList"),
  scenarioTags: document.querySelector("#scenarioTags"),
  evidenceList: document.querySelector("#evidenceList"),
  riskList: document.querySelector("#riskList"),
  strategyList: document.querySelector("#strategyList"),
  needPpt: document.querySelector("#needPpt"),
  goProposalBtn: document.querySelector("#goProposalBtn"),
  generateProposalBtn: document.querySelector("#generateProposalBtn"),
  deckPreview: document.querySelector("#deckPreview"),
  slideTabs: document.querySelector("#slideTabs"),
  chapterRationale: document.querySelector("#chapterRationale"),
  globalProposalFeedback: document.querySelector("#globalProposalFeedback"),
  refineDeckBtn: document.querySelector("#refineDeckBtn"),
  generatePptBtn: document.querySelector("#generatePptBtn"),
  pptGenerationStatus: document.querySelector("#pptGenerationStatus"),
  knowhowRefs: document.querySelector("#knowhowRefs"),
  knowhowStatus: document.querySelector("#knowhowStatus"),
  refreshKnowhowBtn: document.querySelector("#refreshKnowhowBtn"),
  proposalFeedback: document.querySelector("#proposalFeedback"),
  applyFeedbackBtn: document.querySelector("#applyFeedbackBtn"),
  confirmProposalBtn: document.querySelector("#confirmProposalBtn"),
  versionList: document.querySelector("#versionList"),
  knowhowUrl: document.querySelector("#knowhowUrl"),
  knowhowAuth: document.querySelector("#knowhowAuth"),
  knowhowRequestMode: document.querySelector("#knowhowRequestMode"),
  knowhowProxyUrl: document.querySelector("#knowhowProxyUrl"),
  knowhowApiKey: document.querySelector("#knowhowApiKey"),
  businessDomain: document.querySelector("#businessDomain"),
  datasets: document.querySelector("#datasets"),
  topK: document.querySelector("#topK"),
  filterStrategy: document.querySelector("#filterStrategy"),
  industryField: document.querySelector("#industryField"),
  scenarioField: document.querySelector("#scenarioField"),
  qualityFilter: document.querySelector("#qualityFilter"),
  nodePathFilter: document.querySelector("#nodePathFilter"),
  llmBaseUrl: document.querySelector("#llmBaseUrl"),
  llmModel: document.querySelector("#llmModel"),
  llmApiKey: document.querySelector("#llmApiKey"),
  customerTagAgentUrl: document.querySelector("#customerTagAgentUrl"),
  customerTagAgentApiKey: document.querySelector("#customerTagAgentApiKey"),
  customerTagAgentPrompt: document.querySelector("#customerTagAgentPrompt"),
  materialAgentUrl: document.querySelector("#materialAgentUrl"),
  materialAgentApiKey: document.querySelector("#materialAgentApiKey"),
  materialAgentPrompt: document.querySelector("#materialAgentPrompt"),
  pptToolMode: document.querySelector("#pptToolMode"),
  pptToolUrl: document.querySelector("#pptToolUrl"),
  pptToolApiKey: document.querySelector("#pptToolApiKey"),
  pptToolTemplate: document.querySelector("#pptToolTemplate"),
  knowhowRule: document.querySelector("#knowhowRule"),
  saveSettingsBtn: document.querySelector("#saveSettingsBtn"),
  testKnowhowBtn: document.querySelector("#testKnowhowBtn"),
  configDiagnosticText: document.querySelector("#configDiagnosticText"),
  previewModal: document.querySelector("#previewModal"),
  previewTitle: document.querySelector("#previewTitle"),
  previewBody: document.querySelector("#previewBody"),
  closePreviewBtn: document.querySelector("#closePreviewBtn"),
  toast: document.querySelector("#toast"),
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => dom.toast.classList.remove("show"), 2600);
}

function setStatus(text) {
  dom.agentStatus.textContent = text;
}

function switchView(viewName) {
  dom.navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  dom.views.forEach((view) => view.classList.remove("active"));
  document.querySelector(`#${viewName}View`).classList.add("active");
  dom.pageTitle.textContent = {
    diagnosis: "客户诊断",
    proposal: "方案生成",
    settings: "平台配置",
  }[viewName];
}

function detectType(fileName) {
  const ext = fileName.split(".").pop().toLowerCase();
  if (["doc", "docx"].includes(ext)) return "Word";
  if (["ppt", "pptx"].includes(ext)) return "PPT";
  if (ext === "pdf") return "PDF";
  if (["xls", "xlsx", "csv"].includes(ext)) return "Excel";
  return "其他";
}

function inferCustomerTags(customerName = "", extraText = "") {
  const text = `${customerName} ${extraText}`;
  const tags = [];
  const seen = new Set();

  customerTagRules.forEach((rule) => {
    if (keywordHit(text, rule.words) && !seen.has(`${rule.category}:${rule.label}`)) {
      tags.push({ category: rule.category, label: rule.label, source: "本地规则兜底" });
      seen.add(`${rule.category}:${rule.label}`);
    }
  });

  if (customerName.includes("上海地产集团")) {
    const tags = [
      { category: "industry", label: "房地产与城投", source: "客户名称" },
      { category: "region", label: "上海", source: "客户名称" },
      { category: "ownership", label: "地方国企", source: "本地规则兜底" },
      { category: "market", label: "上市状态待核验", source: "需外部核验" },
      { category: "scale", label: "集团型客户", source: "客户名称" },
    ];
    if (keywordHit(text, ["资产", "物业", "租赁", "园区", "招商"])) {
      tags.push({ category: "scenario", label: "资产运营", source: "材料语义" });
    }
    if (keywordHit(text, ["工程", "项目", "建设", "进度", "投资"])) {
      tags.push({ category: "scenario", label: "工程项目管理", source: "材料语义" });
    }
    return tags;
  }

  if (customerName.includes("集团") && !tags.some((tag) => tag.label === "集团型客户")) {
    tags.push({ category: "scale", label: "集团型客户", source: "客户名称" });
  }

  return tags;
}

function getPrimaryIndustry(tags = state.customerTags) {
  return tags.find((tag) => tag.category === "industry")?.label || "行业未识别";
}

function getTagsByCategory(category, tags = state.customerTags) {
  return tags.filter((tag) => tag.category === category).map((tag) => tag.label);
}

function renderCustomerTags() {
  if (!state.customerTags.length) {
    const profile = state.customerProfile;
    if (profile?.status === "error") {
      dom.customerTagPanel.innerHTML = '<div class="tag-placeholder">未获取到有效企业画像，请检查大模型配置或重新识别</div>';
      if (dom.customerTagQuality) {
        dom.customerTagQuality.textContent = `识别失败 · ${profile.message || "核心字段缺失"}`;
        dom.customerTagQuality.className = "tag-quality error";
      }
    } else {
      dom.customerTagPanel.innerHTML = '<div class="tag-placeholder">输入客户名称后自动调用大模型识别行业、地区、企业属性等标签</div>';
      if (dom.customerTagQuality) {
        dom.customerTagQuality.textContent = "等待识别结果";
        dom.customerTagQuality.className = "tag-quality";
      }
    }
    return;
  }

  dom.customerTagPanel.innerHTML = state.customerTags
    .map(
      (tag) =>
        `<span class="tag ${escapeHtml(tag.category)}" title="${escapeHtml(tag.source)}">${escapeHtml(tag.label)}</span>`,
    )
    .join("");
  if (dom.customerTagQuality) {
    const profile = buildTagQualityFromCurrentTags();
    if (profile?.status === "success") {
      dom.customerTagQuality.textContent = `识别成功 · 运营主体：${profile.companyName || "已识别"} · 行业：${profile.industry || "已识别"} · 上市状态：${profile.marketStatus || "已识别"} · 置信度：${Math.round((profile.confidence || 0) * 100)}%`;
      dom.customerTagQuality.className = "tag-quality success";
    } else if (profile?.status === "partial") {
      dom.customerTagQuality.textContent = `识别部分成功 · ${profile.message || "部分标签仍待核验"}`;
      dom.customerTagQuality.className = "tag-quality warn";
    } else if (profile?.status === "error") {
      dom.customerTagQuality.textContent = `识别失败 · ${profile.message || "未获取到有效企业画像"}`;
      dom.customerTagQuality.className = "tag-quality error";
    } else {
      dom.customerTagQuality.textContent = "等待识别结果";
      dom.customerTagQuality.className = "tag-quality";
    }
  }

  if (dom.customerProfileSummary) {
    const profile = buildTagQualityFromCurrentTags();
    if (!profile) {
      dom.customerProfileSummary.innerHTML = "";
    } else {
      const rows = [
        ["公司主体", profile.companyName || "未识别"],
        ["行业", profile.industry || "未识别"],
        ["地区", profile.region || "未识别"],
        ["企业属性", profile.ownership || "未识别"],
        ["上市状态", profile.marketStatus || "未识别"],
        ["置信度", profile.confidence ? `${Math.round(profile.confidence * 100)}%` : "未返回"],
        ["识别依据", profile.reason || "未返回"],
      ];
      dom.customerProfileSummary.innerHTML = `
        <div class="profile-summary-title">企业画像摘要</div>
        <dl class="profile-summary-grid">
          ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      `;
    }
  }
}

function renderCustomerTagLoading(text = "正在调用大模型识别企业标签...") {
  dom.customerTagPanel.innerHTML = `<div class="tag-placeholder">${escapeHtml(text)}</div>`;
  if (dom.customerTagQuality) {
    dom.customerTagQuality.textContent = text;
    dom.customerTagQuality.className = "tag-quality loading";
  }
}

function buildTagQualityFromCurrentTags() {
  const tags = state.customerTags || [];
  const hasIndustry = tags.some((tag) => tag.category === "industry");
  const hasMarket = tags.some((tag) => tag.category === "market");
  const hasRegion = tags.some((tag) => tag.category === "region");
  const hasOwnership = tags.some((tag) => tag.category === "ownership");
  const companyName = state.customerProfile?.companyName || dom.customerName.value.trim();

  if (state.customerProfile?.status === "success") return state.customerProfile;
  if (hasIndustry || hasMarket || hasRegion || hasOwnership) {
    return {
      status: "partial",
      companyName,
      industry: hasIndustry ? tags.find((tag) => tag.category === "industry")?.label : "",
      marketStatus: hasMarket ? tags.find((tag) => tag.category === "market")?.label : "",
      confidence: state.customerProfile?.confidence || 0,
      missing: [
        !companyName ? "公司主体" : "",
        !hasIndustry ? "行业" : "",
        !hasRegion ? "地区" : "",
        !hasOwnership ? "企业属性" : "",
        !hasMarket ? "上市状态" : "",
      ].filter(Boolean),
      message: "未返回完整公司画像",
    };
  }
  return state.customerProfile || null;
}

function getCustomerTagContext() {
  return `${dom.overallNotes.value} ${state.materials.map((item) => `${item.name} ${item.description}`).join(" ")}`.trim();
}

function getLocalCustomerTags() {
  const extraText = `${dom.overallNotes.value} ${state.materials.map((item) => item.description).join(" ")}`;
  return inferCustomerTags(dom.customerName.value.trim(), extraText);
}

function normalizeCustomerTagAgentResult(payload = {}) {
  const data = payload.data || payload.result || payload.output || payload;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch (error) {
      return { summary: data };
    }
  }
  return data && typeof data === "object" ? data : {};
}

function makeLlmChatEndpoint(baseUrl) {
  const normalized = (baseUrl || "").trim().replace(/\/+$/, "");
  if (!normalized) return "";
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

function extractJsonObject(text = "") {
  const clean = String(text)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(clean);
  } catch (error) {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return { summary: clean };
    try {
      return JSON.parse(match[0]);
    } catch (innerError) {
      return { summary: clean };
    }
  }
}

async function callOpenAiCompatibleJson({ system, user, settings }) {
  const endpoint = makeLlmChatEndpoint(settings.llmBaseUrl);
  if (!endpoint || !settings.llmModel) {
    throw new Error("大模型 Base URL 或模型名未配置。");
  }
  if (!settings.llmApiKey) {
    throw new Error("大模型 API Key 未配置。");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.llmApiKey}`,
    },
    body: JSON.stringify({
      model: settings.llmModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`大模型 HTTP ${response.status}${errorText ? `：${errorText.slice(0, 160)}` : ""}`);
  }

  const data = await response.json();
  const content =
    data.choices?.[0]?.message?.content ||
    data.output_text ||
    data.content ||
    data.result ||
    "";
  return typeof content === "object" ? content : extractJsonObject(content);
}

function pushTag(tags, seen, category, value, source) {
  if (!value) return;
  const values = Array.isArray(value) ? value : String(value).split(/[，,、;；/]/);
  values
    .map((item) => {
      if (item && typeof item === "object") return item.label || item.name || item.value || item.title || "";
      return String(item).trim();
    })
    .filter(Boolean)
    .forEach((label) => {
      const key = `${category}:${label}`;
      if (seen.has(key)) return;
      tags.push({ category, label, source });
      seen.add(key);
    });
}

function firstText(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const item = value.find(Boolean);
      if (item) return firstText(item);
    } else if (value && typeof value === "object") {
      const nested = value.label || value.name || value.value || value.title || value.text;
      if (nested) return String(nested).trim();
    } else if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function normalizeCustomerTagsFromAgent(result, customerName) {
  const tags = [];
  const seen = new Set();
  const source = result.reason ? `大模型识别：${result.reason}` : "大模型识别";
  const flatTags = result.tags || result.labels || result.customerTags;

  if (Array.isArray(flatTags)) {
    flatTags.forEach((item) => {
      if (typeof item === "string") {
        pushTag(tags, seen, "tag", item, source);
      } else if (item && typeof item === "object") {
        pushTag(tags, seen, item.category || item.type || "tag", item.label || item.name || item.value, item.source || source);
      }
    });
  }

  const companyName = firstText(result.company_name, result.companyName, result.legal_name, result.subject, result.operator);
  const industry = firstText(result.industry, result.industryTag, result.industry_label);
  const region = firstText(result.region, result.location, result.area, result.city);
  const ownership = firstText(result.ownership, result.ownershipTag, result.enterpriseProperty, result.company_type);
  const marketStatus = firstText(result.market_status, result.market, result.marketTag, result.listedStatus, result.isListed);
  const scale = firstText(result.scale, result.scaleTag);

  pushTag(tags, seen, "company", companyName, source);
  pushTag(tags, seen, "industry", industry, source);
  pushTag(tags, seen, "region", region, source);
  pushTag(tags, seen, "ownership", ownership, source);
  pushTag(tags, seen, "market", marketStatus, source);
  pushTag(tags, seen, "scale", scale, source);
  pushTag(tags, seen, "alias", result.aliases || result.alias, source);

  const businessTags = normalizeArray(result.business_tags || result.businessTags);
  const technologyTags = normalizeArray(result.technology_tags || result.technologyTags);
  const marketTags = normalizeArray(result.market_tags || result.marketTags);
  businessTags.forEach((tag) => pushTag(tags, seen, "business", tag, source));
  technologyTags.forEach((tag) => pushTag(tags, seen, "technology", tag, source));
  marketTags.forEach((tag) => pushTag(tags, seen, "market-position", tag, source));

  const confidence = Number(result.confidence);
  const complete = Boolean(
    companyName &&
      industry &&
      region &&
      ownership &&
      marketStatus &&
      businessTags.length &&
      technologyTags.length &&
      marketTags.length,
  );
  const hasUsefulCore = Boolean(companyName || industry || marketStatus || businessTags.length || technologyTags.length || marketTags.length);
  const status = complete && confidence >= 0.5 ? "success" : hasUsefulCore ? "partial" : "error";
  const missing = [];
  if (!companyName) missing.push("公司主体");
  if (!industry) missing.push("行业");
  if (!region) missing.push("地区");
  if (!ownership) missing.push("企业属性");
  if (!marketStatus) missing.push("上市状态");
  if (!businessTags.length) missing.push("业务标签");
  if (!technologyTags.length) missing.push("技术标签");
  if (!marketTags.length) missing.push("市场标签");

  return {
    tags: tags.slice(0, 16),
    profile: {
      status,
      companyName,
      industry,
      region,
      ownership,
      marketStatus,
      confidence: Number.isFinite(confidence) ? confidence : 0,
      reason: result.reason || "",
      missing,
      message:
        status === "success"
          ? ""
          : status === "partial"
            ? `缺少 ${missing.join("、") || "部分标签"}`
            : `未返回可用企业画像：${missing.join("、") || "核心标签缺失"}`,
    },
  };
}

async function callCustomerTagAgent(customerName) {
  const settings = state.settings;
  const endpoint = settings.customerTagAgentUrl?.trim();
  if (!endpoint) {
    const result = await callOpenAiCompatibleJson({
      settings,
      system:
        "你是面向 ToB 售前的企业画像识别 Agent。只输出 JSON，不输出 Markdown。需要基于客户名称和上下文识别公司主体、行业、地区、企业属性、上市状态、业务标签、技术标签和市场标签；不确定的信息请标注待核验，但不要把待确认当成最终结果。",
      user: JSON.stringify(
        {
          customerName,
          context: getCustomerTagContext(),
          prompt: settings.customerTagAgentPrompt,
          example_for_quality:
            "例如客户名称为“墨迹天气”时，应识别到运营主体北京墨迹风云科技股份有限公司、非上市、商业气象服务/科学研究和技术服务业、工具类 App、B 端气象服务、AI+气象、国民级天气 App 等，而不是只输出行业待确认或上市状态待核验。",
          expected_schema: {
            company_name: "公司主体",
            industry: "行业标签",
            region: "地区",
            ownership: "央国企/地方国企/民企等企业属性",
            market: "上市公司/非上市/待核验",
            market_status: "上市状态",
            business_tags: ["业务标签"],
            technology_tags: ["技术标签"],
            market_tags: ["市场标签"],
            aliases: ["企业别名"],
            confidence: 0.8,
            reason: "识别依据",
          },
        },
        null,
        2,
      ),
    });
    const normalized = normalizeCustomerTagsFromAgent(result, customerName);
    return { ...normalized, mode: "llm" };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(settings.customerTagAgentApiKey || settings.llmApiKey
        ? { Authorization: `Bearer ${settings.customerTagAgentApiKey || settings.llmApiKey}` }
        : {}),
    },
    body: JSON.stringify({
      customerName,
      context: getCustomerTagContext(),
      prompt: settings.customerTagAgentPrompt,
      expected_schema: {
        company_name: "公司主体",
        industry: "行业标签",
        region: "地区",
        ownership: "央国企/地方国企/民企等企业属性",
        market: "上市公司/非上市/待核验",
        market_status: "上市状态",
        business_tags: ["业务标签"],
        technology_tags: ["技术标签"],
        market_tags: ["市场标签"],
        scale: "集团型客户等规模标签",
        aliases: ["企业别名"],
        confidence: 0.8,
        reason: "识别依据",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`客户标签 Agent HTTP ${response.status}${errorText ? `：${errorText.slice(0, 120)}` : ""}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const raw = contentType.includes("application/json") ? await response.json() : await response.text();
  const result = normalizeCustomerTagAgentResult(raw);
  const normalized = normalizeCustomerTagsFromAgent(result, customerName);
  return { ...normalized, mode: "agent" };
}

function refreshCustomerTags() {
  state.customerTagMode = "local";
  state.customerTags = getLocalCustomerTags();
  state.customerProfile = buildTagQualityFromCurrentTags();
  renderCustomerTags();
}

function refreshCustomerTagsWithAgent(options = {}) {
  const customerName = dom.customerName.value.trim();
  window.clearTimeout(refreshCustomerTagsWithAgent.timer);
  if (!customerName) {
    state.customerTags = [];
    state.customerProfile = null;
    state.customerTagMode = "empty";
    renderCustomerTags();
    return Promise.resolve();
  }

  state.settings = getConfiguredSettings();
  localStorage.setItem("agentSettings", JSON.stringify(state.settings));

  const run = async () => {
    const requestName = dom.customerName.value.trim();
    if (!requestName) return;
    const requestId = uid();
    refreshCustomerTagsWithAgent.latestRequestId = requestId;

    if (state.settings.customerTagAgentUrl || state.settings.llmApiKey) {
      renderCustomerTagLoading();
    }

    try {
      const result = await callCustomerTagAgent(requestName);
      if (refreshCustomerTagsWithAgent.latestRequestId !== requestId || dom.customerName.value.trim() !== requestName) return;
      state.customerTagMode = result.mode;
      state.customerTags = result.tags || [];
      state.customerProfile = result.profile || null;
      renderCustomerTags();
      if (result.profile?.status === "error" && options.notify !== false) {
        showToast(`客户标签识别失败：${result.profile.message || "核心标签缺失"}`);
      } else if (result.profile?.status === "partial" && options.notify !== false) {
        showToast(`客户标签部分识别完成：${result.profile.message || "仍有标签待核验"}`);
      } else if (result.mode === "local" && options.notify !== false) {
        showToast("未配置客户标签识别 Agent，已使用本地规则兜底。");
      }
    } catch (error) {
      if (refreshCustomerTagsWithAgent.latestRequestId !== requestId) return;
      state.customerTagMode = "fallback";
      state.customerTags = getLocalCustomerTags();
      state.customerProfile = {
        status: state.customerTags.length ? "partial" : "error",
        message: error.message,
        confidence: 0,
        missing: ["企业画像"],
      };
      renderCustomerTags();
      showToast(`客户标签 Agent 调用失败，当前视为识别失败：${error.message}`);
    }
  };

  const delay = options.immediate ? 0 : 650;
  return new Promise((resolve) => {
    refreshCustomerTagsWithAgent.timer = window.setTimeout(() => {
      run().finally(resolve);
    }, delay);
  });
}

function addMaterial(file) {
  state.materials.push({
    id: uid(),
    name: file?.name || "未命名材料",
    size: file?.size || 0,
    type: file ? detectType(file.name) : "其他",
    file: file || null,
    extractedText: "",
    llmInsight: null,
    parseStatus: file ? "待大模型分析" : "手动描述",
    description: "",
  });
  renderMaterials();
}

function formatSize(size) {
  if (!size) return "手动添加";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function renderMaterials() {
  dom.materialList.innerHTML = "";

  state.materials.forEach((material) => {
    const card = document.createElement("div");
    card.className = "material-card";
    card.innerHTML = `
      <div class="material-meta">
        <strong title="${material.name}">${material.name}</strong>
        <span>${formatSize(material.size)} · ${material.parseStatus || "待解析"}</span>
      </div>
      <select class="material-type" aria-label="材料类型">
        ${["Word", "PPT", "PDF", "Excel", "其他"]
          .map((type) => `<option value="${type}" ${type === material.type ? "selected" : ""}>${type}</option>`)
          .join("")}
      </select>
      <button class="icon-btn" type="button" aria-label="删除材料">×</button>
      <textarea placeholder="材料信息描述：来源、主要内容、关键诉求、可信度、是否来自客户等">${material.description}</textarea>
    `;

    card.querySelector("select").addEventListener("change", (event) => {
      material.type = event.target.value;
    });

    card.querySelector("textarea").addEventListener("input", (event) => {
      material.description = event.target.value;
      refreshCustomerTagsWithAgent({ notify: false });
    });

    card.querySelector("button").addEventListener("click", () => {
      state.materials = state.materials.filter((item) => item.id !== material.id);
      renderMaterials();
    });

    dom.materialList.appendChild(card);
  });
}

function collectInput() {
  if (!state.customerTags.length && dom.customerName.value.trim()) {
    state.customerTagMode = "local";
    refreshCustomerTags();
  }
  const industry = getPrimaryIndustry();

  return {
    customerName: dom.customerName.value.trim(),
    industry,
    customerTags: state.customerTags,
    regions: getTagsByCategory("region"),
    ownershipTags: getTagsByCategory("ownership"),
    marketTags: getTagsByCategory("market"),
    projectStage: dom.projectStage.value,
    expectedOutput: dom.expectedOutput.value,
    overallNotes: dom.overallNotes.value.trim(),
    materials: state.materials,
  };
}

function validateDiagnosisInput(input) {
  if (!input.customerName) return "请先填写客户名称。";
  if (!input.overallNotes) return "请补充整体信息与售前判断。";
  if (input.materials.length === 0) return "请至少添加一份材料。";
  const missing = input.materials.find((material) => !material.description.trim());
  if (missing) return `材料「${missing.name}」还缺少信息描述。`;
  return "";
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function setProgress(percent, title, activeStep) {
  dom.analysisProgress.classList.remove("hidden");
  dom.progressTitle.textContent = title;
  dom.progressPercent.textContent = `${percent}%`;
  dom.progressFill.style.width = `${percent}%`;
  dom.progressSteps.querySelectorAll("li").forEach((step) => {
    const isActive = step.dataset.step === activeStep;
    step.classList.toggle("active", isActive);
    if (isActive) return;
    const order = ["read", "parse", "extract", "reason"];
    step.classList.toggle("done", order.indexOf(step.dataset.step) < order.indexOf(activeStep));
  });
}

function finishProgress() {
  setProgress(100, "诊断完成", "reason");
  dom.progressSteps.querySelectorAll("li").forEach((step) => {
    step.classList.remove("active");
    step.classList.add("done");
  });
}

function buildMaterialAgentPayload(input, settings) {
  return {
    prompt: settings.materialAgentPrompt,
    customer: {
      name: input.customerName,
      industry: input.industry,
      tags: input.customerTags,
      regions: input.regions,
      ownershipTags: input.ownershipTags,
      marketTags: input.marketTags,
      projectStage: input.projectStage,
      expectedOutput: input.expectedOutput,
      overallNotes: input.overallNotes,
    },
    materials: input.materials.map((material) => ({
      id: material.id,
      name: material.name,
      type: material.type,
      size: material.size,
      description: material.description,
    })),
    expected_schema: {
      summary: "客户材料整体洞察",
      keywords: ["关键词"],
      scenarios: ["需求场景"],
      pains: ["痛点/诉求/目标"],
      risks: ["潜在风险"],
      evidence: ["可引用材料证据"],
      materials: [
        {
          id: "材料 id",
          summary: "逐份材料摘要",
          keywords: ["材料关键词"],
          scenarios: ["材料需求场景"],
          evidence: ["材料证据"],
        },
      ],
    },
  };
}

function normalizeMaterialAgentResult(payload = {}) {
  const data = payload.data || payload.result || payload.output || payload;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch (error) {
      return { summary: data };
    }
  }
  return data && typeof data === "object" ? data : {};
}

async function analyzeMaterialsWithLLM(input) {
  const settings = state.settings;
  const endpoint = settings.materialAgentUrl?.trim();

  if (!endpoint) {
    input.materials.forEach((material) => {
      material.extractedText = "";
      material.llmInsight = {
        summary: material.description,
        keywords: extractKeywords(material.description).slice(0, 5),
        evidence: [`材料描述：${material.description}`],
      };
      material.parseStatus = "未配置大模型 Agent，暂按材料描述分析";
    });
    renderMaterials();
    const fallbackResult = {
      summary: "尚未配置材料分析大模型 Agent，本次诊断仅使用客户名称、材料描述和售前整体判断。正式场景需由大模型服务读取 Word/PPT/PDF/Excel 正文后返回结构化洞察。",
      keywords: extractKeywords(`${input.overallNotes} ${input.materials.map((material) => material.description).join(" ")}`),
      scenarios: inferScenarios(input),
      pains: [],
      risks: ["未接入材料分析大模型 Agent 时，上传文件正文未被充分阅读，诊断可信度会受影响。"],
      evidence: input.materials.map((material) => `${material.type}《${material.name}》：${material.description}`),
      materials: input.materials.map((material) => material.llmInsight),
      source: "description-only",
    };
    showToast("未配置材料分析大模型 Agent，暂按描述生成诊断。");
    return fallbackResult;
  }

  const form = new FormData();
  form.append("payload", JSON.stringify(buildMaterialAgentPayload(input, settings)));
  input.materials.forEach((material) => {
    if (material.file) form.append("files", material.file, material.name);
  });

  const headers = {};
  if (settings.materialAgentApiKey) {
    headers.Authorization = `Bearer ${settings.materialAgentApiKey}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`材料分析 Agent HTTP ${response.status}${errorText ? `：${errorText.slice(0, 120)}` : ""}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const raw = contentType.includes("application/json") ? await response.json() : await response.text();
  const result = normalizeMaterialAgentResult(raw);
  const materialResults = Array.isArray(result.materials) ? result.materials : [];

  input.materials.forEach((material, index) => {
    const insight =
      materialResults.find((item) => item.id === material.id || item.name === material.name) ||
      materialResults[index] ||
      {};
    material.llmInsight = insight;
    material.extractedText = [insight.summary, insight.evidence?.join("；")].filter(Boolean).join("；");
    material.parseStatus = insight.summary ? "大模型已分析" : "大模型已调用，未返回逐份摘要";
  });

  renderMaterials();
  return { ...result, source: "llm-agent" };
}

function getAnalysisCorpus(input) {
  return [
    input.customerName,
    input.overallNotes,
    ...input.customerTags.map((tag) => tag.label),
    ...input.materials.map((material) => `${material.name} ${material.description} ${material.extractedText || ""}`),
  ].join(" ");
}

function extractKeywords(corpus) {
  const rules = [
    "经营分析",
    "经营会",
    "驾驶舱",
    "数据治理",
    "指标口径",
    "财务分析",
    "预算",
    "成本",
    "利润",
    "资产运营",
    "工程项目",
    "销售回款",
    "租赁收入",
    "项目投资",
    "工程进度",
    "风险合规",
    "数据质量",
    "自动生成PPT",
    "跨部门协同",
  ];
  const hits = rules.filter((keyword) => corpus.includes(keyword));
  const fallback = corpus
    .replace(/[，。；、：:,.!?()[\]{}]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && word.length <= 12)
    .slice(0, 8);
  return Array.from(new Set([...hits, ...fallback])).slice(0, 12);
}

function normalizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item));
  if (typeof value === "string") {
    return value
      .split(/[；;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function buildEvidence(input, materialAnalysis = state.materialAnalysis) {
  const llmEvidence = normalizeArray(materialAnalysis?.evidence);
  if (llmEvidence.length) return llmEvidence.slice(0, 8);

  const evidence = [];

  input.materials.forEach((material) => {
    const source = material.parseStatus || "基于材料描述";
    const text = material.llmInsight?.summary || material.extractedText || material.description;
    evidence.push(`${material.type}《${material.name}》：${source}，关键信息为「${text.slice(0, 86)}${text.length > 86 ? "..." : ""}」。`);
  });

  evidence.push(`售前整体判断：${input.overallNotes.slice(0, 110)}${input.overallNotes.length > 110 ? "..." : ""}`);
  return evidence.slice(0, 6);
}

function buildCoreIssues(input, keywords, scenarios) {
  const corpus = getAnalysisCorpus(input);
  const issues = [
    {
      level: "高",
      title: "核心场景不够聚焦",
      detail: `材料指向${scenarios.slice(0, 3).join("、")}，需要先确定最有价值的样板场景。`,
    },
    {
      level: "高",
      title: "指标口径与数据质量风险",
      detail: keywordHit(corpus, ["口径", "数据质量", "治理", "标准"])
        ? "材料已出现口径、治理或质量信号，需优先确认指标定义和数据来源。"
        : "若缺少指标口径确认，后续方案容易停留在页面展示，难以支撑管理决策。",
    },
    {
      level: "中",
      title: "决策链与验收标准待澄清",
      detail: "需要明确管理层、业务部门、IT 的关注点差异，以及阶段验收标准。",
    },
  ];

  if (keywordHit(corpus, ["PPT", "材料", "经营会", "月会", "汇报"])) {
    issues.unshift({
      level: "高",
      title: "经营汇报效率低",
      detail: "材料反复准备和人工整理是显性痛点，可作为方案价值切入口。",
    });
  }

  if (keywords.includes("资产运营") || keywords.includes("工程项目")) {
    issues.push({
      level: "中",
      title: "地产场景指标链条长",
      detail: "资产、工程、财务、销售回款等指标跨系统，需设计跨部门数据闭环。",
    });
  }

  return issues.slice(0, 4);
}

function buildMaterialInsights(input) {
  return input.materials.map((material) => {
    const llmInsight = material.llmInsight || {};
    const insightKeywords = normalizeArray(llmInsight.keywords);
    const text = `${material.description} ${llmInsight.summary || ""} ${material.extractedText || ""}`;
    let level = "中";
    if (keywordHit(text, ["口径", "风险", "问题", "不一致", "分散", "周期长", "人工"])) level = "高";
    if (keywordHit(text, ["规划", "目标", "希望", "提升"])) level = level === "高" ? "高" : "中";

    const tags = Array.from(new Set([...insightKeywords, ...extractKeywords(text)])).slice(0, 4);
    return {
      level,
      title: material.name,
      source: material.parseStatus || "基于材料描述",
      tags,
      summary:
        llmInsight.summary ||
        text.slice(0, 120) ||
        "暂无大模型材料洞察，建议补充材料描述或配置材料分析 Agent。",
    };
  });
}

function keywordHit(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function inferScenarios(input) {
  const allText = getAnalysisCorpus(input);
  const scenarios = new Set();
  normalizeArray(state.materialAnalysis?.scenarios).forEach((scenario) => scenarios.add(scenario));
  const candidates = scenarioLibrary[input.industry] || scenarioLibrary.制造业;
  (input.customerTags || [])
    .filter((tag) => tag.category === "scenario")
    .forEach((tag) => scenarios.add(tag.label));

  const rules = [
    { name: "财务分析", words: ["财务", "预算", "利润", "成本", "费用"] },
    { name: "经营分析会", words: ["经营", "驾驶舱", "月会", "季会", "指标"] },
    { name: "数据治理", words: ["口径", "主数据", "质量", "治理", "标准"] },
    { name: "生产制造", words: ["生产", "制造", "工厂", "排产", "质量"] },
    { name: "供应链协同", words: ["供应链", "库存", "采购", "交付", "补货"] },
    { name: "风险合规", words: ["风险", "合规", "审计", "监管", "内控"] },
    { name: "会员运营", words: ["会员", "用户", "复购", "营销", "增长"] },
    { name: "资产运营", words: ["资产", "物业", "租赁", "园区", "招商"] },
    { name: "工程项目管理", words: ["工程", "项目", "投资", "建设", "进度"] },
  ];

  rules.forEach((rule) => {
    if (keywordHit(allText, rule.words)) scenarios.add(rule.name);
  });

  candidates.slice(0, 2).forEach((scenario) => scenarios.add(scenario));
  return Array.from(scenarios).slice(0, 5);
}

function buildDiagnosis(input) {
  const scenarios = inferScenarios(input);
  const tagText = input.customerTags.map((tag) => tag.label).join("、");
  const corpus = getAnalysisCorpus(input);
  const analysis = state.materialAnalysis || {};
  const llmKeywords = normalizeArray(analysis.keywords);
  const keywords = Array.from(new Set([...llmKeywords, ...extractKeywords(corpus)])).slice(0, 12);
  const evidence = buildEvidence(input, analysis);
  const coreIssues = buildCoreIssues(input, keywords, scenarios);
  const materialInsights = buildMaterialInsights(input);
  const materialSummary = input.materials
    .map(
      (material) =>
        `${material.type}《${material.name}》：${material.llmInsight?.summary || material.description}${
          material.extractedText ? `；大模型证据摘录：${material.extractedText.slice(0, 90)}` : ""
        }`,
    )
    .join("；");
  const llmPains = normalizeArray(analysis.pains);
  const llmRisks = normalizeArray(analysis.risks);
  const llmSummary = analysis.summary ? `大模型材料分析认为：${analysis.summary}。` : "";

  return {
    background: `${input.customerName}处于「${input.projectStage}」阶段，AI 初步识别客户画像为：${tagText}。结合${input.industry}相关场景和已收集材料，项目大概率由经营管理精细化、数据口径统一、跨部门协同效率提升等诉求触发。${llmSummary}材料显示：${materialSummary}。售前补充信息进一步说明客户希望把分散经验沉淀为可持续的管理与分析能力。`,
    coreIssues,
    keywords,
    materialInsights,
    pains: [
      ...llmPains,
      `材料关键词集中在${keywords.slice(0, 5).join("、")}，说明客户关注点不只是系统建设，还包括业务管理闭环。`,
      "关键业务指标、数据口径和管理报表存在分散或不一致风险，影响管理层快速判断。",
      `客户诉求集中在${scenarios.join("、")}等场景，需要把业务目标转化为可落地的系统能力。`,
      "一线业务、IT、管理层之间对优先级和验收标准可能尚未完全对齐。",
      "现有材料更多描述现象和期望，需要继续确认业务流程、数据来源、权限边界和历史系统约束。",
    ].slice(0, 8),
    scenarios,
    evidence,
    risks: [
      ...llmRisks,
      "需求边界持续扩张，导致方案范围、周期和报价难以稳定。",
      "客户内部数据质量、系统接口和历史报表口径不清，可能影响演示效果和项目交付节奏。",
      "关键决策人与实际使用部门关注点不同，若缺少统一场景故事线，方案容易被评价为泛化。",
      "缺少标杆案例或行业 Knowhow 支撑时，客户可能对投入产出和落地可信度存疑。",
    ].slice(0, 8),
    strategies: [
      "用一次需求澄清会确认项目发起背景、决策链、预算窗口、关键场景和验收标准。",
      `围绕${scenarios[0]}先做高价值样板场景，形成可演示的业务闭环和指标体系。`,
      "整理客户材料中的显性诉求与隐性风险，输出问题清单，让客户逐项确认优先级。",
      "调用 Knowhow 平台检索同行业、同场景 PPT 与案例，补充方案可信度和差异化表达。",
      "在下一轮交流中同步项目计划、资源投入、客户配合事项和阶段成果，降低推进不确定性。",
    ],
  };
}

function renderList(target, items) {
  target.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderDiagnosis() {
  const diagnosis = state.diagnosis;
  dom.diagnosisEmpty.classList.add("hidden");
  dom.diagnosisResult.classList.remove("hidden");
  dom.coreIssueGrid.innerHTML = diagnosis.coreIssues
    .map(
      (issue) => `
        <div class="issue-card priority-${issue.level}">
          <span>${escapeHtml(issue.level)}优先级</span>
          <strong>${escapeHtml(issue.title)}</strong>
          <p>${escapeHtml(issue.detail)}</p>
        </div>
      `,
    )
    .join("");
  dom.keywordTags.innerHTML = diagnosis.keywords
    .map((keyword, index) => `<span class="tag ${index < 4 ? "key" : ""}">${escapeHtml(keyword)}</span>`)
    .join("");
  dom.materialInsightList.innerHTML = diagnosis.materialInsights
    .map(
      (insight) => `
        <div class="material-insight priority-${insight.level}">
          <div class="material-insight-head">
            <strong>${escapeHtml(insight.title)}</strong>
            <span>${escapeHtml(insight.level)}影响</span>
          </div>
          <p>${escapeHtml(insight.summary)}</p>
          <div class="tag-row mini-tags">
            ${insight.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
          <small>${escapeHtml(insight.source)}</small>
        </div>
      `,
    )
    .join("");
  dom.backgroundText.textContent = diagnosis.background;
  renderList(dom.painList, diagnosis.pains);
  renderList(dom.riskList, diagnosis.risks);
  renderList(dom.strategyList, diagnosis.strategies);
  renderList(dom.evidenceList, diagnosis.evidence);
  dom.scenarioTags.innerHTML = diagnosis.scenarios
    .map((scenario) => `<span class="tag">${scenario}</span>`)
    .join("");
}

function buildProposal(input, diagnosis, feedback = "") {
  const scenario = diagnosis.scenarios[0] || "经营分析";
  const feedbackText = feedback.trim();
  const regionText = input.regions.length ? `${input.regions.join("、")}区域` : "目标区域";
  const ownershipText = input.ownershipTags.length ? input.ownershipTags.join("、") : "目标客户";
  const selectedRefs = getSelectedKnowhowRefs();
  const referenceText = selectedRefs.length
    ? `本版方案参考了 ${selectedRefs.map((ref) => `${ref.customerName}《${ref.pptTitle}》`).join("、")}。`
    : "本版方案尚未勾选 Knowhow 参考材料。";
  const feedbackNote = feedbackText ? `已吸收综合调整意见：${feedbackText}` : "基于当前诊断和已选参考方案生成。";
  const materialProof = diagnosis.evidence.slice(0, 3);
  const coreScenarios = diagnosis.scenarios.slice(0, Math.max(3, Math.min(diagnosis.scenarios.length, 5)));
  const slides = [
    {
      chapter: "背景",
      title: "项目背景与客户画像",
      type: "paragraph",
      content: [
        `${input.customerName}被初步识别为${regionText}的${ownershipText}，正在推进${input.industry}场景下的数字化能力升级。`,
        `客户资料显示，本次项目应以${scenario}为牵引，回应经营决策、数据口径、跨部门协同和材料自动化等关键诉求。`,
        referenceText,
      ],
      rationale:
        "先把客户是谁、为什么现在要做、方案参考了哪些材料交代清楚，让听众建立可信的上下文，而不是直接进入产品介绍。",
    },
    {
      chapter: "背景",
      title: "材料证据与问题信号",
      type: "bullets",
      content: materialProof,
      rationale:
        "这一页把客户材料中的证据前置，说明方案不是模板化输出，而是基于客户材料和售前判断逐条推导出来。",
    },
    {
      chapter: "痛点",
      title: "核心问题与痛点归纳",
      type: "bullets",
      content: diagnosis.coreIssues.map((issue) => `${issue.title}：${issue.detail}`),
      rationale:
        "痛点页不罗列所有问题，只呈现高优先级矛盾，帮助客户快速确认我们是否理解了真正的业务阻塞点。",
    },
    {
      chapter: "目标",
      title: "项目建设目标",
      type: "bullets",
      content: [
        `围绕${scenario}建立统一指标体系和业务分析框架。`,
        "将客户关键管理场景沉淀为可复用的数据资产、分析模板和汇报机制。",
        "提升经营会、专题分析和管理决策效率，减少人工整理材料和反复口径沟通。",
        "形成可试点、可验收、可推广的阶段性建设路径。",
      ],
      rationale:
        "目标页把客户诉求转化为可验收成果，避免停留在抽象愿景，后续方案和计划都围绕这些目标展开。",
    },
    ...coreScenarios.map((item, index) => ({
      chapter: "方案",
      title: `${item}解决方案设计`,
      type: "bullets",
      content: [
        `场景定位：围绕${item}识别关键角色、管理动作、指标口径和业务流程。`,
        `能力建设：设计${item}驾驶舱、专题分析、指标预警、问题追踪和汇报输出能力。`,
        selectedRefs[index]
          ? `参考案例：借鉴${selectedRefs[index].customerName}《${selectedRefs[index].pptTitle}》中关于${selectedRefs[index].businessScenario}的结构表达。`
          : "参考案例：待进一步选中 Knowhow 参考材料后补充标杆实践。",
        "落地闭环：明确数据来源、责任部门、使用频率、输出材料和阶段验收标准。",
      ],
      rationale:
        "方案章节根据实际需求场景拆页展开，不把复杂解决方案压缩成一页，确保每个场景都有对象、能力、数据和落地闭环。",
    })),
    {
      chapter: "方案",
      title: "总体技术与数据治理支撑",
      type: "bullets",
      content: [
        "统一指标口径、数据源映射、数据质量规则和权限边界。",
        "沉淀主题数据集、场景分析模型和可复用 PPT 输出模板。",
        "建立从数据接入、加工治理、分析应用到经营汇报的完整链路。",
      ],
      rationale:
        "在业务场景之后补充共性支撑能力，避免方案只讲页面效果，也避免一开始就陷入技术架构。",
    },
    {
      chapter: "计划",
      title: "项目实施计划与阶段成果",
      type: "bullets",
      content: [
        "第 1 阶段：需求澄清与样板场景确认，输出业务蓝图和范围说明。",
        "第 2 阶段：数据盘点与原型方案设计，完成关键页面和指标口径评审。",
        "第 3 阶段：试点建设与业务验证，形成演示环境、试运行报告和推广计划。",
        "第 4 阶段：规模化推广与运营移交，沉淀模板、手册和持续优化机制。",
      ],
      rationale:
        "计划页把方案落到时间、成果和验收物上，让客户看到项目不是概念交流，而是可以推进的实施路径。",
    },
    {
      chapter: "资源",
      title: "资源投入与协同机制",
      type: "bullets",
      content: [
        "我方投入：解决方案顾问、行业顾问、产品专家、交付架构师、项目经理。",
        "客户投入：业务负责人、IT 负责人、数据接口人、关键使用部门代表。",
        "联合机制：每周项目例会、双周高层同步、关键风险专题会和阶段验收会。",
      ],
      rationale:
        "资源页提前明确双方投入和协作节奏，降低客户对交付风险、配合成本和推进责任的疑虑。",
    },
  ];

  return {
    slides,
    feedbackNote,
    references: selectedRefs,
  };
}

function renderProposal() {
  const proposal = state.proposal;
  if (!proposal) return;

  dom.deckPreview.innerHTML = proposal.slides
    .map(
      (slide, index) => `
        <div class="slide ${index === 0 ? "active" : ""}" data-slide="${index}">
          <p class="slide-index">${String(index + 1).padStart(2, "0")}</p>
          <span class="chapter-chip">${escapeHtml(slide.chapter)}</span>
          <h4>${escapeHtml(slide.title)}</h4>
          ${
            slide.type === "paragraph"
              ? slide.content.map((item) => `<p>${escapeHtml(item)}</p>`).join("")
              : `<ul>${slide.content.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
          }
        </div>
      `,
    )
    .join("");
  dom.slideTabs.innerHTML = proposal.slides
    .map(
      (slide, index) =>
        `<button class="${index === 0 ? "active" : ""}" data-slide="${index}">${escapeHtml(slide.chapter)}${index + 1}</button>`,
    )
    .join("");
  renderChapterRationale(0);
  renderKnowhowRefs();
  renderVersions();
}

function renderChapterRationale(index) {
  const slide = state.proposal?.slides?.[index];
  if (!slide) return;
  dom.chapterRationale.innerHTML = `
    <p class="eyebrow">Writing Logic</p>
    <h4>${escapeHtml(slide.title)}</h4>
    <p>${escapeHtml(slide.rationale)}</p>
    <small>${escapeHtml(state.proposal.feedbackNote || "")}</small>
  `;
}

function setPptStatus(message, type = "info") {
  if (!dom.pptGenerationStatus) return;
  dom.pptGenerationStatus.textContent = message;
  dom.pptGenerationStatus.className = `tool-status ${type}`;
}

function safeFileName(value) {
  return String(value || "solution")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

function splitTextForPpt(items, maxItems = 7) {
  return normalizeArray(items).slice(0, maxItems).map((item) => item.length > 86 ? `${item.slice(0, 86)}...` : item);
}

function xmlEscape(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function emu(inches) {
  return Math.round(inches * 914400);
}

function makeTextShape(id, text, x, y, w, h, options = {}) {
  const fontSize = Math.round((options.fontSize || 14) * 100);
  const color = options.color || "31423D";
  const bold = options.bold ? ' b="1"' : "";
  const paragraphs = normalizeArray(text).length ? normalizeArray(text) : [String(text || "")];
  const paragraphXml = paragraphs
    .map((item) => {
      const bullet = options.bullet ? '<a:pPr marL="228600" indent="-171450"><a:buChar char="•"/></a:pPr>' : '<a:pPr/>';
      return `<a:p>${bullet}<a:r><a:rPr lang="zh-CN" sz="${fontSize}"${bold}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/></a:rPr><a:t>${xmlEscape(item)}</a:t></a:r><a:endParaRPr lang="zh-CN" sz="${fontSize}"/></a:p>`;
    })
    .join("");

  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" rtlCol="0"><a:spAutoFit/></a:bodyPr><a:lstStyle/>${paragraphXml}</p:txBody></p:sp>`;
}

function makeRectShape(id, x, y, w, h, fill) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Accent ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${fill}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>`;
}

function makeBuiltInSlideXml(slide, index, total) {
  const bg = index % 2 === 0 ? "F8FBFA" : "FFFFFF";
  const bodyItems =
    slide.type === "paragraph"
      ? normalizeArray(slide.content).join("\n\n")
      : splitTextForPpt(slide.content, 7);
  const shapes = [
    makeRectShape(2, 0, 0, 13.333, 0.28, "83CBB7"),
    makeTextShape(3, String(index + 1).padStart(2, "0"), 0.52, 0.48, 0.55, 0.32, {
      fontSize: 13,
      color: "B88B26",
      bold: true,
    }),
    makeTextShape(4, slide.chapter || "方案", 1.16, 0.49, 1.5, 0.28, {
      fontSize: 10,
      color: "27745F",
      bold: true,
    }),
    makeTextShape(5, slide.title, 0.72, 1.02, 11.8, 0.62, {
      fontSize: 24,
      color: "17201F",
      bold: true,
    }),
    makeTextShape(6, bodyItems, 0.9, 1.9, 11.2, 3.78, {
      fontSize: slide.type === "paragraph" ? 15 : 14,
      color: "31423D",
      bullet: slide.type !== "paragraph",
    }),
    makeTextShape(7, `写作思路：${slide.rationale || "围绕客户材料、诊断结论和参考案例展开。"}`, 0.72, 6.25, 11.9, 0.42, {
      fontSize: 8.5,
      color: "68706D",
    }),
    makeTextShape(8, `${index + 1} / ${total}`, 11.75, 6.92, 0.9, 0.18, {
      fontSize: 8,
      color: "68706D",
    }),
  ].join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${bg}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

function makeSlideMasterXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`;
}

function makeSlideLayoutXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
}

function makeThemeXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="CUSOLUTION"><a:themeElements><a:clrScheme name="CUSOLUTION"><a:dk1><a:srgbClr val="17201F"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="31423D"/></a:dk2><a:lt2><a:srgbClr val="F8FBFA"/></a:lt2><a:accent1><a:srgbClr val="83CBB7"/></a:accent1><a:accent2><a:srgbClr val="2F6F9F"/></a:accent2><a:accent3><a:srgbClr val="B88B26"/></a:accent3><a:accent4><a:srgbClr val="C95B44"/></a:accent4><a:accent5><a:srgbClr val="68706D"/></a:accent5><a:accent6><a:srgbClr val="E2EFE9"/></a:accent6><a:hlink><a:srgbClr val="2F6F9F"/></a:hlink><a:folHlink><a:srgbClr val="27745F"/></a:folHlink></a:clrScheme><a:fontScheme name="CUSOLUTION"><a:majorFont><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface="Microsoft YaHei"/></a:majorFont><a:minorFont><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface="Microsoft YaHei"/></a:minorFont></a:fontScheme><a:fmtScheme name="CUSOLUTION"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;
}

function makePresentationXml(slides) {
  const slideIds = slides
    .map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="wide"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>`;
}

function makePresentationRels(slides) {
  const slideRels = slides
    .map((_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slideRels}</Relationships>`;
}

function makeContentTypes(slides) {
  const slideTypes = slides
    .map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slideTypes}</Types>`;
}

function makeCoreXml(title) {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(title)}</dc:title><dc:creator>CUSOLUTION</dc:creator><cp:lastModifiedBy>CUSOLUTION</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
}

function makeAppXml(slideCount) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>CUSOLUTION PPT Tool</Application><PresentationFormat>宽屏</PresentationFormat><Slides>${slideCount}</Slides><Company>TOB Solution Center</Company></Properties>`;
}

function makeRelXml(type, target) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${type}" Target="${target}"/></Relationships>`;
}

function makePptxFiles(slides, title) {
  const files = {
    "[Content_Types].xml": makeContentTypes(slides),
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    "docProps/core.xml": makeCoreXml(title),
    "docProps/app.xml": makeAppXml(slides.length),
    "ppt/presentation.xml": makePresentationXml(slides),
    "ppt/_rels/presentation.xml.rels": makePresentationRels(slides),
    "ppt/slideMasters/slideMaster1.xml": makeSlideMasterXml(),
    "ppt/slideMasters/_rels/slideMaster1.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`,
    "ppt/slideLayouts/slideLayout1.xml": makeSlideLayoutXml(),
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels": makeRelXml("http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster", "../slideMasters/slideMaster1.xml"),
    "ppt/theme/theme1.xml": makeThemeXml(),
  };

  slides.forEach((slide, index) => {
    files[`ppt/slides/slide${index + 1}.xml`] = makeBuiltInSlideXml(slide, index, slides.length);
    files[`ppt/slides/_rels/slide${index + 1}.xml.rels`] = makeRelXml("http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout", "../slideLayouts/slideLayout1.xml");
  });

  return files;
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

const crcTable = makeCrcTable();

function crc32(bytes) {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function push16(target, value) {
  target.push(value & 0xff, (value >>> 8) & 0xff);
}

function push32(target, value) {
  target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function makeZipBlob(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const local = [];
    push32(local, 0x04034b50);
    push16(local, 20);
    push16(local, 0x0800);
    push16(local, 0);
    push16(local, dosTime);
    push16(local, dosDate);
    push32(local, crc);
    push32(local, data.length);
    push32(local, data.length);
    push16(local, nameBytes.length);
    push16(local, 0);
    chunks.push(new Uint8Array(local), nameBytes, data);

    const header = [];
    push32(header, 0x02014b50);
    push16(header, 20);
    push16(header, 20);
    push16(header, 0x0800);
    push16(header, 0);
    push16(header, dosTime);
    push16(header, dosDate);
    push32(header, crc);
    push32(header, data.length);
    push32(header, data.length);
    push16(header, nameBytes.length);
    push16(header, 0);
    push16(header, 0);
    push16(header, 0);
    push16(header, 0);
    push32(header, 0);
    push32(header, offset);
    central.push(new Uint8Array(header), nameBytes);
    offset += local.length + nameBytes.length + data.length;
  });

  const centralSize = central.reduce((sum, item) => sum + item.length, 0);
  const end = [];
  push32(end, 0x06054b50);
  push16(end, 0);
  push16(end, 0);
  push16(end, Object.keys(files).length);
  push16(end, Object.keys(files).length);
  push32(end, centralSize);
  push32(end, offset);
  push16(end, 0);

  return new Blob([...chunks, ...central, new Uint8Array(end)], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}

async function generatePptWithBuiltInTool() {
  const fileName = `${safeFileName(dom.customerName.value)}_解决方案_${new Date().toISOString().slice(0, 10)}.pptx`;
  const title = `${dom.customerName.value || "客户"}解决方案`;
  const files = makePptxFiles(state.proposal.slides, title);
  downloadBlob(makeZipBlob(files), fileName);
  return { fileName, mode: "built-in" };
}

function addPptSlide(pptx, slide, index, total) {
  const page = pptx.addSlide();
  const bg = index % 2 === 0 ? "F8FBFA" : "FFFFFF";
  page.background = { color: bg };
  const rectShape = pptx.ShapeType?.rect || window.pptxgen?.ShapeType?.rect || window.PptxGenJS?.ShapeType?.rect || "rect";
  page.addShape(rectShape, { x: 0, y: 0, w: 13.333, h: 0.28, fill: { color: "83CBB7" }, line: { color: "83CBB7" } });
  page.addText(String(index + 1).padStart(2, "0"), {
    x: 0.52,
    y: 0.48,
    w: 1.2,
    h: 0.34,
    fontFace: "Microsoft YaHei",
    fontSize: 13,
    bold: true,
    color: "B88B26",
    margin: 0,
  });
  page.addText(slide.chapter || "方案", {
    x: 1.15,
    y: 0.49,
    w: 1.5,
    h: 0.3,
    fontFace: "Microsoft YaHei",
    fontSize: 10,
    bold: true,
    color: "27745F",
    margin: 0,
  });
  page.addText(slide.title, {
    x: 0.72,
    y: 1.02,
    w: 11.8,
    h: 0.62,
    fontFace: "Microsoft YaHei",
    fontSize: 24,
    bold: true,
    color: "17201F",
    margin: 0,
    breakLine: false,
  });

  const bodyItems = slide.type === "paragraph" ? slide.content : splitTextForPpt(slide.content, 7);
  if (slide.type === "paragraph") {
    page.addText(bodyItems.join("\n\n"), {
      x: 0.86,
      y: 2,
      w: 11.4,
      h: 3.4,
      fontFace: "Microsoft YaHei",
      fontSize: 15,
      color: "31423D",
      breakLine: false,
      fit: "shrink",
      valign: "top",
      margin: 0.04,
    });
  } else {
    page.addText(
      bodyItems.map((item) => ({ text: item, options: { bullet: { type: "bullet" }, breakLine: true } })),
      {
        x: 0.9,
        y: 1.9,
        w: 11.2,
        h: 3.72,
        fontFace: "Microsoft YaHei",
        fontSize: 14,
        color: "31423D",
        breakLine: false,
        fit: "shrink",
        paraSpaceAfterPt: 8,
        margin: 0.06,
      },
    );
  }

  page.addText(`写作思路：${slide.rationale || "围绕客户材料、诊断结论和参考案例展开。"}`, {
    x: 0.72,
    y: 6.25,
    w: 11.9,
    h: 0.42,
    fontFace: "Microsoft YaHei",
    fontSize: 8.5,
    color: "68706D",
    fit: "shrink",
    margin: 0,
  });
  page.addText(`${index + 1} / ${total}`, {
    x: 11.75,
    y: 6.92,
    w: 0.9,
    h: 0.18,
    fontFace: "Arial",
    fontSize: 8,
    color: "68706D",
    align: "right",
    margin: 0,
  });
}

async function generatePptInBrowser() {
  const PptxGen = window.pptxgen || window.PptxGenJS || window.pptxgenjs;
  if (!PptxGen) {
    return generatePptWithBuiltInTool();
  }

  const pptx = new PptxGen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "CUSOLUTION";
  pptx.company = "TOB Solution Center";
  pptx.subject = "客户诊断与解决方案";
  pptx.title = `${dom.customerName.value || "客户"}解决方案`;
  pptx.lang = "zh-CN";
  pptx.theme = {
    headFontFace: "Microsoft YaHei",
    bodyFontFace: "Microsoft YaHei",
    lang: "zh-CN",
  };

  state.proposal.slides.forEach((slide, index) => addPptSlide(pptx, slide, index, state.proposal.slides.length));
  const fileName = `${safeFileName(dom.customerName.value)}_解决方案_${new Date().toISOString().slice(0, 10)}.pptx`;
  await pptx.writeFile({ fileName });
  return { fileName, mode: "browser" };
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
}

function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

async function generatePptByService(settings) {
  if (!settings.pptToolUrl) {
    throw new Error("已选择后端 PPT 生成服务，但尚未配置 PPT 生成工具接口。");
  }

  const response = await fetch(settings.pptToolUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(settings.pptToolApiKey ? { Authorization: `Bearer ${settings.pptToolApiKey}` } : {}),
    },
    body: JSON.stringify({
      template: settings.pptToolTemplate,
      customer: collectInput(),
      diagnosis: state.diagnosis,
      materialAnalysis: state.materialAnalysis,
      proposal: state.proposal,
      references: getSelectedKnowhowRefs(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`PPT 生成工具 HTTP ${response.status}${errorText ? `：${errorText.slice(0, 120)}` : ""}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const fileName = `${safeFileName(dom.customerName.value)}_解决方案_${new Date().toISOString().slice(0, 10)}.pptx`;
  if (contentType.includes("presentation") || contentType.includes("application/octet-stream")) {
    downloadBlob(await response.blob(), fileName);
    return { fileName, mode: "service" };
  }

  const data = await response.json();
  const downloadUrl = data.download_url || data.downloadUrl || data.file_url || data.fileUrl || data.url;
  if (downloadUrl) {
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
    return { fileName: data.file_name || fileName, mode: "service-url" };
  }

  const base64 = data.base64 || data.file_base64 || data.pptx_base64;
  if (base64) {
    downloadBlob(base64ToBlob(base64, "application/vnd.openxmlformats-officedocument.presentationml.presentation"), data.file_name || fileName);
    return { fileName: data.file_name || fileName, mode: "service-base64" };
  }

  throw new Error("PPT 生成工具已返回，但未包含文件、download_url 或 base64。");
}

async function generatePptFile() {
  if (!state.proposal) {
    showToast("请先生成方案框架。");
    return;
  }

  state.settings = getConfiguredSettings();
  localStorage.setItem("agentSettings", JSON.stringify(state.settings));
  const settings = state.settings;

  try {
    setPptStatus("正在调用 PPT 生成工具，请稍候...", "working");
    dom.generatePptBtn.disabled = true;
    const result = settings.pptToolMode === "service" ? await generatePptByService(settings) : await generatePptInBrowser();
    setPptStatus(`PPT 已生成：${result.fileName}`, "success");
    setStatus("PPT 已生成");
    showToast("正式 PPT 文件已生成。");
  } catch (error) {
    setPptStatus(`PPT 生成失败：${error.message}`, "error");
    showToast(`PPT 生成失败：${error.message}`);
  } finally {
    dom.generatePptBtn.disabled = false;
  }
}

function getConfiguredSettings() {
  return {
    knowhowUrl: dom.knowhowUrl.value.trim() || state.settings.knowhowUrl,
    knowhowAuth: dom.knowhowAuth.value || state.settings.knowhowAuth,
    knowhowRequestMode: dom.knowhowRequestMode.value || state.settings.knowhowRequestMode || "direct",
    knowhowProxyUrl: dom.knowhowProxyUrl.value.trim(),
    knowhowApiKey: dom.knowhowApiKey.value.trim() || state.settings.knowhowApiKey,
    businessDomain: dom.businessDomain.value || state.settings.businessDomain,
    datasets: dom.datasets.value || state.settings.datasets,
    topK: Number(dom.topK.value || state.settings.topK || 20),
    filterStrategy: dom.filterStrategy.value || state.settings.filterStrategy || "loose",
    industryField: dom.industryField.value.trim() || state.settings.industryField,
    scenarioField: dom.scenarioField.value.trim() || state.settings.scenarioField,
    qualityFilter: dom.qualityFilter.value.trim(),
    nodePathFilter: dom.nodePathFilter.value.trim(),
    llmBaseUrl: dom.llmBaseUrl.value.trim() || state.settings.llmBaseUrl || defaultSettings.llmBaseUrl,
    llmModel: dom.llmModel.value.trim() || state.settings.llmModel || defaultSettings.llmModel,
    llmApiKey: dom.llmApiKey.value.trim() || state.settings.llmApiKey || "",
    customerTagAgentUrl: dom.customerTagAgentUrl.value.trim(),
    customerTagAgentApiKey: dom.customerTagAgentApiKey.value.trim() || state.settings.customerTagAgentApiKey || "",
    customerTagAgentPrompt: dom.customerTagAgentPrompt.value.trim() || state.settings.customerTagAgentPrompt,
    materialAgentUrl: dom.materialAgentUrl.value.trim(),
    materialAgentApiKey: dom.materialAgentApiKey.value.trim() || state.settings.materialAgentApiKey || "",
    materialAgentPrompt: dom.materialAgentPrompt.value.trim() || state.settings.materialAgentPrompt,
    pptToolMode: dom.pptToolMode.value || state.settings.pptToolMode || "browser",
    pptToolUrl: dom.pptToolUrl.value.trim(),
    pptToolApiKey: dom.pptToolApiKey.value.trim() || state.settings.pptToolApiKey || "",
    pptToolTemplate: dom.pptToolTemplate.value.trim(),
    knowhowRule: dom.knowhowRule.value.trim() || state.settings.knowhowRule,
  };
}

function makeKnowhowEndpoint(baseUrl) {
  const normalized = (baseUrl || "").trim().replace(/\/+$/, "");
  return `${normalized}/api/v1/retrieve`;
}

function getKnowhowRequestUrl(settings) {
  if (settings.knowhowRequestMode === "proxy") {
    return settings.knowhowProxyUrl;
  }
  return makeKnowhowEndpoint(settings.knowhowUrl);
}

function setConfigDiagnostic(type, lines) {
  const className = `diagnostic-${type}`;
  dom.configDiagnosticText.className = className;
  dom.configDiagnosticText.innerHTML = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}

function buildKnowhowQuery(input, diagnosis) {
  const scenarios = diagnosis?.scenarios || inferScenarios(input);
  const painKeywords = (diagnosis?.pains || [])
    .join(" ")
    .replace(/[，。；、：]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4)
    .slice(0, 8)
    .join(" ");

  return [
    input.customerName ? `客户名称：${input.customerName}` : "",
    `行业：${input.industry}`,
    input.regions?.length ? `地区：${input.regions.join("、")}` : "",
    input.ownershipTags?.length ? `企业属性：${input.ownershipTags.join("、")}` : "",
    input.marketTags?.length ? `上市公司标签：${input.marketTags.join("、")}` : "",
    `需求场景：${scenarios.join("、")}`,
    "请推荐最匹配的其他客户案例、场景案例、PPT 解决方案、最佳实践材料。",
    painKeywords ? `重点痛点关键词：${painKeywords}` : "",
  ]
    .filter(Boolean)
    .join("；");
}

function buildKnowhowPayload(input, diagnosis, settings) {
  const scenarios = diagnosis?.scenarios || inferScenarios(input);
  const metadataFilters = {};
  const isConnectivityTest = input.customerName === "Knowhow 配置连通性测试";
  const strategy = settings.filterStrategy || "loose";

  if (strategy !== "loose" && settings.industryField && input.industry) {
    metadataFilters[settings.industryField] = {
      value: [input.industry],
      operator: "containsAny",
    };
  }

  if (strategy !== "loose" && input.regions?.length) {
    metadataFilters.tags = metadataFilters.tags || {
      value: [],
      operator: "containsAny",
    };
    metadataFilters.tags.value.push(...input.regions);
  }

  if (strategy !== "loose" && input.ownershipTags?.length) {
    metadataFilters.tags = metadataFilters.tags || {
      value: [],
      operator: "containsAny",
    };
    metadataFilters.tags.value.push(...input.ownershipTags);
  }

  if (strategy !== "loose" && settings.scenarioField && scenarios.length) {
    const existing = metadataFilters[settings.scenarioField]?.value || [];
    metadataFilters[settings.scenarioField] = {
      value: Array.from(new Set([...existing, ...scenarios])),
      operator: "containsAny",
    };
  }

  if (strategy === "strict" && settings.qualityFilter && !isConnectivityTest) {
    metadataFilters.quality = {
      value: settings.qualityFilter,
      operator: "equals",
    };
  }

  if (strategy === "strict" && settings.nodePathFilter && !isConnectivityTest) {
    metadataFilters.node_path = {
      value: settings.nodePathFilter.split(/[，,]/).map((item) => item.trim()).filter(Boolean),
      operator: "containsAny",
    };
  }

  return {
    query: buildKnowhowQuery(input, diagnosis),
    retrieval_model: {
      business_domain: settings.businessDomain || "project",
      datasets: settings.datasets || "both",
      rerank_enable: true,
      top_k: Math.min(Math.max(Number(settings.topK) || 20, 1), 500),
      vector_weight: 0.7,
      rerank_blend_weight: 0.3,
    },
    metadata_filters: metadataFilters,
  };
}

function makeLooseSettings(settings) {
  return {
    ...settings,
    filterStrategy: "loose",
    qualityFilter: "",
    nodePathFilter: "",
  };
}

function getNestedValue(source, paths) {
  for (const path of paths) {
    const value = path.split(".").reduce((current, key) => current?.[key], source);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function findKnowhowRows(payload) {
  const preferredPaths = [
    "data.results",
    "data.items",
    "data.documents",
    "data.records",
    "data.list",
    "data.hits",
    "data.chunks",
    "results",
    "items",
    "documents",
    "records",
    "list",
    "hits",
    "chunks",
  ];

  for (const path of preferredPaths) {
    const value = getNestedValue(payload, [path]);
    if (Array.isArray(value) && value.length) return value;
  }

  const queue = [payload];
  const seen = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);

    if (Array.isArray(current)) {
      if (current.length && current.some((item) => item && typeof item === "object")) return current;
      continue;
    }

    Object.values(current).forEach((value) => {
      if (value && typeof value === "object") queue.push(value);
    });
  }

  return [];
}

function summarizePayloadShape(payload) {
  if (!payload || typeof payload !== "object") return "返回值不是对象";
  return Object.entries(payload)
    .slice(0, 8)
    .map(([key, value]) => `${key}:${Array.isArray(value) ? `array(${value.length})` : typeof value}`)
    .join("，");
}

function normalizeKnowhowResults(payload, input) {
  const rows = findKnowhowRows(payload);

  return rows.slice(0, 10).map((item, index) => {
    const document = item.document || item.doc || item.dataset_document || {};
    const segment = item.segment || item.chunk || item.hit || {};
    const metadata = item.metadata || item.meta || document.metadata || document.meta || segment.metadata || segment.meta || {};
    const title =
      getNestedValue(item, [
        "title",
        "name",
        "document.title",
        "document.name",
        "document.file_name",
        "doc.title",
        "doc.name",
        "segment.title",
        "metadata.title",
        "metadata.file_name",
        "metadata.filename",
        "meta.title",
        "meta.file_name",
      ]) ||
      `Knowhow 推荐 ${index + 1}`;
    const customer =
      getNestedValue(item, [
        "customer",
        "customer_name",
        "metadata.customer",
        "metadata.customer_name",
        "meta.customer",
        "document.customer",
        "document.metadata.customer",
        "doc.metadata.customer",
      ]) || "历史客户";
    const scenario =
      getNestedValue(item, [
        "scenario",
        "business_scenario",
        "scene",
        "metadata.scenario",
        "metadata.business_scenario",
        "metadata.scene",
        "metadata.tags.0",
        "document.metadata.scenario",
        "doc.metadata.scenario",
      ]) ||
      state.diagnosis?.scenarios?.[index % Math.max(state.diagnosis?.scenarios?.length || 1, 1)] ||
      "相似业务场景";
    const score =
      getNestedValue(item, [
        "score",
        "rerank_score",
        "vector_score",
        "similarity",
        "metadata.score",
        "segment.score",
      ]) || "";
    const rawScore = score ? Number(score) : 0.92 - index * 0.035;
    const scoreNumber = rawScore > 1 ? rawScore / 100 : rawScore;
    const previewUrl =
      getNestedValue(item, [
        "preview_url",
        "url",
        "link",
        "metadata.preview_url",
        "metadata.url",
        "metadata.link",
        "document.preview_url",
        "document.url",
        "document.link",
        "doc.url",
      ]) || "";
    const snippet =
      getNestedValue(item, [
        "content",
        "text",
        "summary",
        "page_content",
        "chunk",
        "segment.content",
        "segment.text",
        "hit.content",
        "document.summary",
        "document.content",
        "doc.summary",
        "metadata.summary",
      ]) || "已从 Knowhow 平台召回，可作为方案结构、案例表达或材料内容参考。";

    return {
      id: `api-${index}-${title}-${customer}`,
      customerName: customer,
      businessScenario: scenario,
      pptTitle: title,
      matchScore: Math.round(scoreNumber * 100),
      previewUrl,
      name: title,
      meta: `${customer} · ${scenario} · 匹配度 ${Math.round(scoreNumber * 100)}%`,
      summary: snippet.length > 120 ? `${snippet.slice(0, 120)}...` : snippet,
    };
  });
}

function buildMockKnowhowRefs(input, diagnosis) {
  const scenarios = diagnosis?.scenarios?.length ? diagnosis.scenarios : ["经营分析会", "资产运营", "数据治理"];
  const baseNames = industrySolutionMap[input.industry] || industrySolutionMap.制造业;
  const customerSeeds = [
    "华东城市建设集团",
    "上海临港资产运营集团",
    "长三角地产控股",
    "华南城投集团",
    "浙江产业园区发展集团",
    "江苏城市更新集团",
    "北京基础设施投资集团",
    "深圳产业空间运营公司",
    "成都交投置业集团",
    "广州国资地产集团",
  ];

  return Array.from({ length: 10 }, (_, index) => {
    const scenario = scenarios[index % scenarios.length];
    const pptTitle = baseNames[index % baseNames.length];
    return {
      id: `mock-${index + 1}`,
      customerName: customerSeeds[index],
      businessScenario: scenario,
      pptTitle,
      matchScore: 96 - index * 3,
      previewUrl: "",
      name: pptTitle,
      meta: `${customerSeeds[index]} · ${scenario} · 匹配度 ${96 - index * 3}%`,
      summary:
        index < 3
          ? "可作为主方案框架参考，重点借鉴项目背景、场景价值、业务指标和阶段计划。"
          : "可补充行业案例、业务场景表达、方案章节素材和客户价值表述。",
    };
  });
}

function renderKnowhowRefs() {
  const input = collectInput();
  const refs = state.knowhowRefs.length
    ? state.knowhowRefs
    : buildMockKnowhowRefs(input, state.diagnosis);

  dom.knowhowStatus.textContent =
    state.knowhowMode === "api"
      ? `已从 Knowhow API 召回 TOP ${refs.length} 推荐，请勾选可参考的客户材料。`
      : state.settings.knowhowApiKey
        ? `Knowhow API 尚未打通，当前显示 TOP ${refs.length} 模拟推荐。请到平台配置查看连接诊断。`
        : `未配置 API Key，当前显示 TOP ${refs.length} 模拟推荐。`;

  dom.knowhowRefs.innerHTML = refs
    .map(
      (ref) => `
        <label class="reference-item selectable">
          <input type="checkbox" data-ref-id="${escapeHtml(ref.id)}" ${
            state.selectedKnowhowIds.has(ref.id) ? "checked" : ""
          } />
          <div class="reference-main">
            <div class="reference-title-row">
              <strong>${escapeHtml(ref.customerName)}</strong>
              <span class="score-badge">${escapeHtml(ref.matchScore)}%</span>
            </div>
            <span>${escapeHtml(ref.businessScenario)} · ${escapeHtml(ref.pptTitle)}</span>
            <p>${escapeHtml(ref.summary || "")}</p>
            <button class="preview-link" type="button" data-preview-id="${escapeHtml(ref.id)}">在线预览材料</button>
          </div>
        </label>
      `,
    )
    .join("");
}

function getSelectedKnowhowRefs() {
  return state.knowhowRefs.filter((ref) => state.selectedKnowhowIds.has(ref.id));
}

function toggleKnowhowRef(refId, checked) {
  if (checked) {
    state.selectedKnowhowIds.add(refId);
  } else {
    state.selectedKnowhowIds.delete(refId);
  }
}

function previewKnowhowRef(refId) {
  const ref = state.knowhowRefs.find((item) => item.id === refId);
  if (!ref) return;

  dom.previewTitle.textContent = `${ref.customerName} · ${ref.pptTitle}`;
  if (ref.previewUrl) {
    dom.previewBody.innerHTML = `
      <iframe class="preview-frame" src="${escapeHtml(ref.previewUrl)}" title="${escapeHtml(ref.pptTitle)}"></iframe>
      <div class="preview-footer">
        <a href="${escapeHtml(ref.previewUrl)}" target="_blank" rel="noopener noreferrer">新窗口打开</a>
      </div>
    `;
  } else {
    dom.previewBody.innerHTML = buildMockPreview(ref);
  }
  dom.previewModal.classList.remove("hidden");
}

function closePreview() {
  dom.previewModal.classList.add("hidden");
  dom.previewBody.innerHTML = "";
}

function buildMockPreview(ref) {
  return `
    <div class="mock-deck">
      <section>
        <p class="slide-index">01</p>
        <h4>${escapeHtml(ref.businessScenario)}方案背景</h4>
        <p>${escapeHtml(ref.customerName)}围绕${escapeHtml(ref.businessScenario)}建设统一分析与管理闭环。</p>
      </section>
      <section>
        <p class="slide-index">02</p>
        <h4>关键痛点</h4>
        <ul>
          <li>指标口径不统一，经营分析依赖人工汇总。</li>
          <li>业务、财务、项目数据分散，问题追踪链路不完整。</li>
          <li>管理层缺少可复用、可下钻、可复盘的专题分析。</li>
        </ul>
      </section>
      <section>
        <p class="slide-index">03</p>
        <h4>可借鉴内容</h4>
        <ul>
          <li>参考材料：${escapeHtml(ref.pptTitle)}</li>
          <li>匹配度：${escapeHtml(ref.matchScore)}%</li>
          <li>${escapeHtml(ref.summary)}</li>
        </ul>
      </section>
    </div>
  `;
}

async function refreshKnowhowRefs(options = {}) {
  const input = options.input || collectInput();
  const settings = getConfiguredSettings();
  const diagnosis = state.diagnosis;

  if (!input.customerName && !diagnosis) {
    input.customerName = "Knowhow 配置连通性测试";
    input.industry = "零售";
    input.customerTags = [{ category: "industry", label: "零售", source: "测试查询" }];
    input.regions = ["华南"];
    input.ownershipTags = [];
    input.marketTags = [];
    input.projectStage = "需求调研";
    input.expectedOutput = "客户诊断报告";
    input.overallNotes = "零售行业的成功案例有哪些？";
    input.materials = [];
  }

  if (!settings.knowhowApiKey) {
    state.knowhowRefs = buildMockKnowhowRefs(input, diagnosis);
    state.knowhowMode = "mock";
    state.selectedKnowhowIds = new Set();
    renderKnowhowRefs();
    if (options.diagnostic) {
      setConfigDiagnostic("warn", [
        "未填写 API Key，所以只能显示模拟推荐。",
        `当前请求地址：${getKnowhowRequestUrl(settings) || "未配置"}`,
        "解决方式：在平台配置页填写 Knowhow API Key，保存后再测试推荐。",
      ]);
    }
    if (options.notify !== false) showToast("未配置 API Key，已显示模拟推荐。");
    return;
  }

  if (settings.knowhowRequestMode === "proxy" && !settings.knowhowProxyUrl) {
    state.knowhowRefs = buildMockKnowhowRefs(input, diagnosis);
    state.knowhowMode = "mock";
    state.selectedKnowhowIds = new Set();
    renderKnowhowRefs();
    if (options.diagnostic) {
      setConfigDiagnostic("warn", [
        "已选择后端代理模式，但未填写代理接口地址。",
        "解决方式：填写一个由后端转发到 Knowhow 的接口，例如 /api/knowhow/retrieve。",
        "代理接口需要在服务端携带 Authorization 或接收前端传入的 API Key。",
      ]);
    }
    return;
  }

  dom.knowhowStatus.textContent = "正在调用 Knowhow API 检索...";
  let payload = buildKnowhowPayload(input, diagnosis, settings);
  const requestUrl = getKnowhowRequestUrl(settings);

  try {
    const callKnowhow = async (body) => {
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.knowhowApiKey}`,
          "X-Knowhow-Base-Url": settings.knowhowUrl,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status}${errorText ? `：${errorText.slice(0, 120)}` : ""}`);
      }

      return response.json();
    };

    let data = await callKnowhow(payload);
    let refs = normalizeKnowhowResults(data, input);
    let fallbackUsed = false;

    if (!refs.length && settings.filterStrategy !== "loose") {
      payload = buildKnowhowPayload(input, diagnosis, makeLooseSettings(settings));
      data = await callKnowhow(payload);
      refs = normalizeKnowhowResults(data, input);
      fallbackUsed = true;
    }

    state.knowhowRefs = refs.length ? refs : buildMockKnowhowRefs(input, diagnosis);
    state.knowhowMode = refs.length ? "api" : "mock";
    state.selectedKnowhowIds = new Set();
    renderKnowhowRefs();
    if (options.diagnostic) {
      setConfigDiagnostic(refs.length ? "success" : "warn", [
        refs.length
          ? `连接成功，已从 Knowhow API 召回 ${refs.length} 条推荐。${fallbackUsed ? "原过滤条件无结果，已自动改用宽松召回。" : ""}`
          : "接口已返回，但没有解析到推荐结果。",
        `请求地址：${requestUrl}`,
        refs.length ? "状态：配置可用。" : `返回结构摘要：${summarizePayloadShape(data)}`,
      ]);
    }
    if (options.notify !== false) showToast(refs.length ? "Knowhow 推荐已刷新。" : "接口无返回，已显示模拟推荐。");
  } catch (error) {
    state.knowhowRefs = buildMockKnowhowRefs(input, diagnosis);
    state.knowhowMode = "mock";
    state.selectedKnowhowIds = new Set();
    renderKnowhowRefs();
    if (options.diagnostic) {
      const isCors = error.message.includes("Failed to fetch") || error.message.includes("Load failed");
      setConfigDiagnostic("error", [
        isCors ? "浏览器未能直接调用 Knowhow API，常见原因是 CORS 跨域策略或网络不可达。" : `Knowhow API 调用失败：${error.message}`,
        `请求地址：${requestUrl}`,
        isCors
          ? "解决方式：切换为“后端代理转发”并填写代理接口地址；或让 Knowhow API 允许 https://simonlvpin.github.io 跨域访问。"
          : "请检查 API Key、Base URL、业务域、过滤条件和接口权限。",
      ]);
    }
    if (options.notify !== false) showToast(`Knowhow API 暂不可用：${error.message}`);
  }
}

function addVersion(note) {
  state.versions.unshift({
    id: uid(),
    name: `V${state.versions.length + 1}`,
    note,
    time: new Date().toLocaleString("zh-CN", { hour12: false }),
  });
  renderVersions();
}

function renderVersions() {
  const header = '<p class="panel-title">方案版本</p>';
  const body = state.versions
    .map(
      (version) => `
        <div class="version-item">
          <strong>${version.name}</strong>
          <span>${version.note}</span>
        </div>
      `,
    )
    .join("");
  dom.versionList.innerHTML = header + body;
}

async function runDiagnosis() {
  await refreshCustomerTagsWithAgent({ immediate: true, notify: false });
  const input = collectInput();
  const error = validateDiagnosisInput(input);
  if (error) {
    showToast(error);
    return;
  }

  setStatus("诊断中");
  dom.runDiagnosisBtn.disabled = true;
  dom.diagnosisEmpty.classList.remove("hidden");
  dom.diagnosisResult.classList.add("hidden");

  try {
    setProgress(8, "整理客户材料", "read");
    await sleep(260);

    setProgress(28, "调用大模型分析上传材料", "parse");
    state.settings = getConfiguredSettings();
    localStorage.setItem("agentSettings", JSON.stringify(state.settings));
    state.materialAnalysis = await analyzeMaterialsWithLLM(input);
    await refreshCustomerTagsWithAgent({ immediate: true, notify: false });
    await sleep(320);

    setProgress(56, "抽取关键词与需求场景", "extract");
    const enrichedInput = collectInput();
    enrichedInput.materials = input.materials;
    enrichedInput.analysisCorpus = getAnalysisCorpus(enrichedInput);
    await sleep(380);

    setProgress(82, "综合资料与售前判断生成诊断", "reason");
    await sleep(420);

    state.diagnosis = buildDiagnosis(enrichedInput);
    renderDiagnosis();
    finishProgress();
    setStatus("诊断完成");
    showToast("客户诊断已完成，可以进入 PPT 方案生成。");
    await refreshKnowhowRefs({ notify: false, input: enrichedInput });

    if (enrichedInput.expectedOutput.includes("PPT")) {
      state.proposal = buildProposal(enrichedInput, state.diagnosis);
      addVersion("初版生成");
      renderProposal();
    }
  } catch (error) {
    setStatus("诊断失败");
    showToast(`客户诊断失败：${error.message}`);
    setProgress(28, `材料分析失败：${error.message}`, "parse");
  } finally {
    dom.runDiagnosisBtn.disabled = false;
  }
}

function generateProposal() {
  if (!state.diagnosis) {
    showToast("请先完成客户诊断。");
    switchView("diagnosis");
    return;
  }

  state.proposal = buildProposal(collectInput(), state.diagnosis);
  addVersion("基于诊断重新生成");
  renderProposal();
  setStatus("方案已生成");
  showToast("PPT 方案框架已生成。");
}

function applyFeedback() {
  if (!state.diagnosis) {
    showToast("请先完成客户诊断。");
    return;
  }

  const feedback = [dom.globalProposalFeedback.value.trim(), dom.proposalFeedback.value.trim()].filter(Boolean).join("；");
  if (!feedback) {
    showToast("请输入综合调整意见或进一步调整要求。");
    return;
  }

  state.proposal = buildProposal(collectInput(), state.diagnosis, feedback);
  addVersion("采纳反馈调整");
  renderProposal();
  dom.proposalFeedback.value = "";
  dom.globalProposalFeedback.value = "";
  setStatus("方案已更新");
  showToast("已根据反馈生成新版方案。");
}

function loadSample() {
  dom.customerName.value = "上海地产集团";
  dom.projectStage.value = "需求调研";
  dom.expectedOutput.value = "诊断报告 + PPT 方案";
  dom.overallNotes.value =
    "客户集团层面正在推动经营分析会升级，当前地产开发、资产运营、工程项目和财务数据分散在不同系统。管理层希望月度经营会能快速定位项目投资、销售回款、资产出租和工程进度问题，同时减少人工整理 PPT 的时间。";
  state.materials = [
    {
      id: uid(),
      name: "客户经营分析现状访谈纪要.docx",
      size: 486000,
      type: "Word",
      description:
        "来自客户业务部门访谈，重点描述地产集团经营会材料准备周期长、项目指标口径不一致、问题追踪缺少闭环。",
    },
    {
      id: uid(),
      name: "集团数字化规划材料.pdf",
      size: 1320000,
      type: "PDF",
      description:
        "客户三年数字化规划，明确提出数据治理、经营驾驶舱、资产运营分析和管理决策提效。",
    },
    {
      id: uid(),
      name: "月度经营报表样例.xlsx",
      size: 760000,
      type: "Excel",
      description:
        "内部获取的报表样例，包含销售回款、租赁收入、项目投资、工程进度等指标，但口径说明不完整。",
    },
  ];
  refreshCustomerTagsWithAgent({ immediate: true, notify: false });
  renderMaterials();
  showToast("示例信息已填入。");
}

function saveSettings(options = {}) {
  state.settings = getConfiguredSettings();
  localStorage.setItem("agentSettings", JSON.stringify(state.settings));
  if (options.silent !== true) {
    setConfigDiagnostic("warn", [
      "配置已保存，正在进行 Knowhow 连通性测试...",
      `当前请求地址：${getKnowhowRequestUrl(state.settings) || "未配置"}`,
      state.settings.knowhowApiKey ? "已填写 API Key，正在验证接口是否可用。" : "API Key 为空，无法调用真实接口。",
    ]);
    showToast("Knowhow 平台配置已保存，正在测试连接。");
  }
}

async function saveSettingsAndTest() {
  saveSettings();
  await refreshKnowhowRefs({ diagnostic: true });
}

function renderSettings() {
  dom.knowhowUrl.value = state.settings.knowhowUrl;
  dom.knowhowAuth.value = state.settings.knowhowAuth;
  dom.knowhowRequestMode.value = state.settings.knowhowRequestMode || "direct";
  dom.knowhowProxyUrl.value = state.settings.knowhowProxyUrl || "";
  dom.knowhowApiKey.value = state.settings.knowhowApiKey || "";
  dom.businessDomain.value = state.settings.businessDomain;
  dom.datasets.value = state.settings.datasets;
  dom.topK.value = state.settings.topK;
  dom.filterStrategy.value = state.settings.filterStrategy || "loose";
  dom.industryField.value = state.settings.industryField;
  dom.scenarioField.value = state.settings.scenarioField;
  dom.qualityFilter.value = state.settings.qualityFilter || "";
  dom.nodePathFilter.value = state.settings.nodePathFilter || "";
  dom.llmBaseUrl.value = state.settings.llmBaseUrl || defaultSettings.llmBaseUrl;
  dom.llmModel.value = state.settings.llmModel || defaultSettings.llmModel;
  dom.llmApiKey.value = state.settings.llmApiKey || "";
  dom.customerTagAgentUrl.value = state.settings.customerTagAgentUrl || "";
  dom.customerTagAgentApiKey.value = state.settings.customerTagAgentApiKey || "";
  dom.customerTagAgentPrompt.value = state.settings.customerTagAgentPrompt || defaultSettings.customerTagAgentPrompt;
  dom.materialAgentUrl.value = state.settings.materialAgentUrl || "";
  dom.materialAgentApiKey.value = state.settings.materialAgentApiKey || "";
  dom.materialAgentPrompt.value = state.settings.materialAgentPrompt || defaultSettings.materialAgentPrompt;
  dom.pptToolMode.value = state.settings.pptToolMode || "browser";
  dom.pptToolUrl.value = state.settings.pptToolUrl || "";
  dom.pptToolApiKey.value = state.settings.pptToolApiKey || "";
  dom.pptToolTemplate.value = state.settings.pptToolTemplate || "";
  dom.knowhowRule.value = state.settings.knowhowRule;
}

function bindEvents() {
  dom.collapseSidebarBtn.addEventListener("click", () => {
    dom.appShell.classList.toggle("sidebar-collapsed");
  });

  dom.navItems.forEach((item) => {
    item.addEventListener("click", () => switchView(item.dataset.view));
  });

  dom.fileInput.addEventListener("change", (event) => {
    Array.from(event.target.files).forEach(addMaterial);
    event.target.value = "";
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dom.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dom.dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dom.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dom.dropZone.classList.remove("dragging");
    });
  });

  dom.dropZone.addEventListener("drop", (event) => {
    Array.from(event.dataTransfer.files).forEach(addMaterial);
  });

  dom.addMaterialBtn.addEventListener("click", () => addMaterial());
  dom.customerName.addEventListener("input", () => refreshCustomerTagsWithAgent());
  dom.overallNotes.addEventListener("input", () => refreshCustomerTagsWithAgent({ notify: false }));
  dom.runDiagnosisBtn.addEventListener("click", runDiagnosis);
  dom.loadSampleBtn.addEventListener("click", loadSample);
  dom.goProposalBtn.addEventListener("click", () => {
    if (!dom.needPpt.checked) {
      showToast("已选择暂不输出 PPT。");
      return;
    }
    generateProposal();
    switchView("proposal");
  });
  dom.generateProposalBtn.addEventListener("click", generateProposal);
  dom.applyFeedbackBtn.addEventListener("click", applyFeedback);
  dom.confirmProposalBtn.addEventListener("click", () => {
    if (!state.proposal) {
      showToast("请先生成方案。");
      return;
    }
    setStatus("方案已确认");
    showToast("方案已确认，正在调用 PPT 生成工具。");
    generatePptFile();
  });
  dom.generatePptBtn.addEventListener("click", generatePptFile);

  dom.slideTabs.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const slideIndex = button.dataset.slide;
    dom.slideTabs.querySelectorAll("button").forEach((item) => {
      item.classList.toggle("active", item.dataset.slide === slideIndex);
    });
    dom.deckPreview.querySelectorAll(".slide").forEach((slide) => {
      slide.classList.toggle("active", slide.dataset.slide === slideIndex);
    });
    renderChapterRationale(Number(slideIndex));
  });

  dom.refineDeckBtn.addEventListener("click", applyFeedback);

  dom.knowhowRefs.addEventListener("change", (event) => {
    const checkbox = event.target.closest('input[type="checkbox"][data-ref-id]');
    if (!checkbox) return;
    toggleKnowhowRef(checkbox.dataset.refId, checkbox.checked);
    showToast(`已选择 ${state.selectedKnowhowIds.size} 个 Knowhow 参考方案。`);
  });

  dom.knowhowRefs.addEventListener("click", (event) => {
    const previewButton = event.target.closest("[data-preview-id]");
    if (!previewButton) return;
    event.preventDefault();
    previewKnowhowRef(previewButton.dataset.previewId);
  });

  dom.closePreviewBtn.addEventListener("click", closePreview);
  dom.previewModal.addEventListener("click", (event) => {
    if (event.target === dom.previewModal) closePreview();
  });

  dom.saveSettingsBtn.addEventListener("click", saveSettingsAndTest);
  dom.refreshKnowhowBtn.addEventListener("click", () => refreshKnowhowRefs());
  dom.testKnowhowBtn.addEventListener("click", () => {
    saveSettings({ silent: true });
    refreshKnowhowRefs({ diagnostic: true });
  });
}

renderSettings();
bindEvents();
renderVersions();
refreshCustomerTagsWithAgent({ immediate: true, notify: false });

window.CUSOLUTION_DEBUG = {
  normalizeCustomerTagsFromAgent,
  buildTagQualityFromCurrentTags,
  async testCustomerProfile(customerName, result) {
    const normalized = normalizeCustomerTagsFromAgent(result, customerName);
    state.customerTags = normalized.tags;
    state.customerProfile = normalized.profile;
    renderCustomerTags();
    return normalized;
  },
};
