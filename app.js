const state = {
  materials: [],
  diagnosis: null,
  proposal: null,
  versions: [],
  knowhowRefs: [],
  knowhowMode: "mock",
  selectedKnowhowIds: new Set(),
  customerTags: [],
  settings: JSON.parse(localStorage.getItem("agentSettings") || "null") || {
    knowhowUrl: "https://digitchat.fanruan.com/dataset/",
    knowhowAuth: "API Token",
    knowhowRequestMode: "direct",
    knowhowProxyUrl: "",
    knowhowApiKey: "",
    businessDomain: "project",
    datasets: "both",
    topK: 20,
    industryField: "industry",
    scenarioField: "tags",
    qualityFilter: "严选",
    nodePathFilter: "宣传物料",
    knowhowRule:
      "根据客户名称、AI 识别出的行业标签、地区标签、企业属性、需求场景和痛点关键词，调用 POST api/v1/retrieve，召回公司历史客户、场景案例、PPT 解决方案和最佳实践，再由大模型提炼可复用方案结构。",
  },
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
  industryField: document.querySelector("#industryField"),
  scenarioField: document.querySelector("#scenarioField"),
  qualityFilter: document.querySelector("#qualityFilter"),
  nodePathFilter: document.querySelector("#nodePathFilter"),
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
      tags.push({ category: rule.category, label: rule.label, source: "AI 识别" });
      seen.add(`${rule.category}:${rule.label}`);
    }
  });

  if (!tags.some((tag) => tag.category === "industry")) {
    tags.push({ category: "industry", label: "行业待确认", source: "AI 待确认" });
  }

  if (!tags.some((tag) => tag.category === "market")) {
    tags.push({ category: "market", label: "上市状态待核验", source: "AI 待确认" });
  }

  if (customerName.includes("上海地产集团")) {
    const tags = [
      { category: "industry", label: "房地产与城投", source: "客户名称" },
      { category: "region", label: "上海", source: "客户名称" },
      { category: "ownership", label: "地方国企", source: "集团属性推断" },
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
  return tags.find((tag) => tag.category === "industry")?.label || "行业待确认";
}

function getTagsByCategory(category, tags = state.customerTags) {
  return tags.filter((tag) => tag.category === category).map((tag) => tag.label);
}

function renderCustomerTags() {
  if (!state.customerTags.length) {
    dom.customerTagPanel.innerHTML = '<div class="tag-placeholder">输入客户名称后自动识别行业、地区、企业属性等标签</div>';
    return;
  }

  dom.customerTagPanel.innerHTML = state.customerTags
    .map(
      (tag) =>
        `<span class="tag ${escapeHtml(tag.category)}" title="${escapeHtml(tag.source)}">${escapeHtml(tag.label)}</span>`,
    )
    .join("");
}

function refreshCustomerTags() {
  const extraText = `${dom.overallNotes.value} ${state.materials.map((item) => item.description).join(" ")}`;
  state.customerTags = inferCustomerTags(dom.customerName.value.trim(), extraText);
  renderCustomerTags();
}

function addMaterial(file) {
  state.materials.push({
    id: uid(),
    name: file?.name || "未命名材料",
    size: file?.size || 0,
    type: file ? detectType(file.name) : "其他",
    file: file || null,
    extractedText: "",
    parseStatus: file ? "待解析" : "手动描述",
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
      refreshCustomerTags();
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

function canReadFileText(material) {
  const fileName = material.name.toLowerCase();
  return [".txt", ".csv", ".md", ".json", ".log"].some((ext) => fileName.endsWith(ext));
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("文件读取失败"));
    reader.readAsText(file, "utf-8");
  });
}

async function parseMaterials(materials) {
  for (const material of materials) {
    if (!material.file) {
      material.extractedText = material.description;
      material.parseStatus = "基于描述分析";
      continue;
    }

    if (!canReadFileText(material)) {
      material.extractedText = "";
      material.parseStatus = "需后端解析";
      continue;
    }

    try {
      material.extractedText = (await readFileAsText(material.file)).slice(0, 12000);
      material.parseStatus = material.extractedText ? "已解析文本" : "未读取到文本";
    } catch (error) {
      material.extractedText = "";
      material.parseStatus = `解析失败：${error.message}`;
    }
  }

  renderMaterials();
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

function buildEvidence(input) {
  const evidence = [];

  input.materials.forEach((material) => {
    const source = material.extractedText ? "已读取文件文本" : material.parseStatus || "基于材料描述";
    const text = material.extractedText || material.description;
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
    const text = `${material.description} ${material.extractedText || ""}`;
    let level = "中";
    if (keywordHit(text, ["口径", "风险", "问题", "不一致", "分散", "周期长", "人工"])) level = "高";
    if (keywordHit(text, ["规划", "目标", "希望", "提升"])) level = level === "高" ? "高" : "中";

    const tags = extractKeywords(text).slice(0, 4);
    return {
      level,
      title: material.name,
      source: material.parseStatus || "基于材料描述",
      tags,
      summary: text.slice(0, 120) || "暂无正文内容，建议补充材料描述或接入后端解析服务。",
    };
  });
}

function keywordHit(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function inferScenarios(input) {
  const allText = getAnalysisCorpus(input);
  const scenarios = new Set();
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
  const keywords = extractKeywords(corpus);
  const evidence = buildEvidence(input);
  const coreIssues = buildCoreIssues(input, keywords, scenarios);
  const materialInsights = buildMaterialInsights(input);
  const materialSummary = input.materials
    .map(
      (material) =>
        `${material.type}《${material.name}》：${material.description}${
          material.extractedText ? `；文件正文摘录：${material.extractedText.slice(0, 90)}` : ""
        }`,
    )
    .join("；");

  return {
    background: `${input.customerName}处于「${input.projectStage}」阶段，AI 初步识别客户画像为：${tagText}。结合${input.industry}相关场景和已收集材料，项目大概率由经营管理精细化、数据口径统一、跨部门协同效率提升等诉求触发。材料显示：${materialSummary}。售前补充信息进一步说明客户希望把分散经验沉淀为可持续的管理与分析能力。`,
    coreIssues,
    keywords,
    materialInsights,
    pains: [
      `材料关键词集中在${keywords.slice(0, 5).join("、")}，说明客户关注点不只是系统建设，还包括业务管理闭环。`,
      "关键业务指标、数据口径和管理报表存在分散或不一致风险，影响管理层快速判断。",
      `客户诉求集中在${scenarios.join("、")}等场景，需要把业务目标转化为可落地的系统能力。`,
      "一线业务、IT、管理层之间对优先级和验收标准可能尚未完全对齐。",
      "现有材料更多描述现象和期望，需要继续确认业务流程、数据来源、权限边界和历史系统约束。",
    ],
    scenarios,
    evidence,
    risks: [
      "需求边界持续扩张，导致方案范围、周期和报价难以稳定。",
      "客户内部数据质量、系统接口和历史报表口径不清，可能影响演示效果和项目交付节奏。",
      "关键决策人与实际使用部门关注点不同，若缺少统一场景故事线，方案容易被评价为泛化。",
      "缺少标杆案例或行业 Knowhow 支撑时，客户可能对投入产出和落地可信度存疑。",
    ],
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
    : "本版方案尚未勾选 Knowhow 参考案例。";
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
          : "参考案例：待进一步选中 Knowhow PPT 后补充标杆实践。",
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
    industryField: dom.industryField.value.trim() || state.settings.industryField,
    scenarioField: dom.scenarioField.value.trim() || state.settings.scenarioField,
    qualityFilter: dom.qualityFilter.value.trim(),
    nodePathFilter: dom.nodePathFilter.value.trim(),
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

  if (settings.industryField && input.industry) {
    metadataFilters[settings.industryField] = {
      value: [input.industry],
      operator: "containsAny",
    };
  }

  if (input.regions?.length) {
    metadataFilters.tags = metadataFilters.tags || {
      value: [],
      operator: "containsAny",
    };
    metadataFilters.tags.value.push(...input.regions);
  }

  if (input.ownershipTags?.length) {
    metadataFilters.tags = metadataFilters.tags || {
      value: [],
      operator: "containsAny",
    };
    metadataFilters.tags.value.push(...input.ownershipTags);
  }

  if (settings.scenarioField && scenarios.length) {
    const existing = metadataFilters[settings.scenarioField]?.value || [];
    metadataFilters[settings.scenarioField] = {
      value: Array.from(new Set([...existing, ...scenarios])),
      operator: "containsAny",
    };
  }

  if (settings.qualityFilter) {
    metadataFilters.quality = {
      value: settings.qualityFilter,
      operator: "equals",
    };
  }

  if (settings.nodePathFilter) {
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

function normalizeKnowhowResults(payload, input) {
  const source =
    payload?.data?.results ||
    payload?.data ||
    payload?.results ||
    payload?.documents ||
    payload?.items ||
    [];
  const rows = Array.isArray(source) ? source : [];

  return rows.slice(0, 10).map((item, index) => {
    const metadata = item.metadata || item.meta || {};
    const title =
      item.title ||
      item.name ||
      metadata.title ||
      metadata.file_name ||
      metadata.filename ||
      `Knowhow 推荐 ${index + 1}`;
    const customer = metadata.customer || item.customer || "历史客户";
    const scenario =
      metadata.scenario ||
      metadata.business_scenario ||
      metadata.scene ||
      item.scenario ||
      state.diagnosis?.scenarios?.[index % Math.max(state.diagnosis?.scenarios?.length || 1, 1)] ||
      "相似业务场景";
    const score = item.score || item.rerank_score || item.vector_score || item.similarity;
    const scoreNumber = score ? Number(score) : 0.92 - index * 0.035;
    const previewUrl =
      metadata.preview_url ||
      metadata.url ||
      metadata.link ||
      item.preview_url ||
      item.url ||
      item.link ||
      "";
    const snippet =
      item.content ||
      item.text ||
      item.summary ||
      item.chunk ||
      metadata.summary ||
      "已从 Knowhow 平台召回，可作为方案结构、案例表达或 PPT 内容参考。";

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
          : "可补充行业案例、业务场景表达、PPT 章节素材和客户价值表述。",
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
      ? `已从 Knowhow API 召回 TOP ${refs.length} 推荐，请勾选可参考的客户方案。`
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
            <button class="preview-link" type="button" data-preview-id="${escapeHtml(ref.id)}">在线预览 PPT</button>
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
          <li>PPT 方案：${escapeHtml(ref.pptTitle)}</li>
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
    input.customerName = "配置连通性测试";
    input.industry = "房地产与城投";
    input.customerTags = [{ category: "industry", label: "房地产与城投", source: "测试查询" }];
    input.regions = ["上海"];
    input.ownershipTags = ["地方国企"];
    input.marketTags = [];
    input.projectStage = "需求调研";
    input.expectedOutput = "客户诊断报告";
    input.overallNotes = "测试 Knowhow API 是否可以按行业、地区、场景召回客户案例和 PPT 解决方案。";
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
  const payload = buildKnowhowPayload(input, diagnosis, settings);
  const requestUrl = getKnowhowRequestUrl(settings);

  try {
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.knowhowApiKey}`,
        "X-Knowhow-Base-Url": settings.knowhowUrl,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}${errorText ? `：${errorText.slice(0, 120)}` : ""}`);
    }

    const data = await response.json();
    const refs = normalizeKnowhowResults(data, input);
    state.knowhowRefs = refs.length ? refs : buildMockKnowhowRefs(input, diagnosis);
    state.knowhowMode = refs.length ? "api" : "mock";
    state.selectedKnowhowIds = new Set();
    renderKnowhowRefs();
    if (options.diagnostic) {
      setConfigDiagnostic(refs.length ? "success" : "warn", [
        refs.length ? `连接成功，已从 Knowhow API 召回 ${refs.length} 条推荐。` : "接口已返回，但没有解析到推荐结果。",
        `请求地址：${requestUrl}`,
        refs.length ? "状态：配置可用。" : "请检查 API 返回结构是否包含 data/results/items/documents 等结果数组。",
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
    setProgress(8, "读取客户材料", "read");
    await sleep(260);

    setProgress(28, "解析上传文件内容", "parse");
    await parseMaterials(input.materials);
    refreshCustomerTags();
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
  refreshCustomerTags();
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
  dom.industryField.value = state.settings.industryField;
  dom.scenarioField.value = state.settings.scenarioField;
  dom.qualityFilter.value = state.settings.qualityFilter || "";
  dom.nodePathFilter.value = state.settings.nodePathFilter || "";
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
  dom.customerName.addEventListener("input", refreshCustomerTags);
  dom.overallNotes.addEventListener("input", refreshCustomerTags);
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
    showToast("方案已确认，可进入后续导出 PPT 或推送 CRM 流程。");
  });

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
refreshCustomerTags();
