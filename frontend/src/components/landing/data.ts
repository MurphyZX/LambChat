import type { IllustrationScene } from "../common/SceneIllustration";
export interface FeatureItem {
  illustration: IllustrationScene;
  titleKey: string;
  descKey: string;
}

export interface ScreenshotItem {
  src: string;
  altKey: string;
}

export const FEATURES: FeatureItem[] = [
  {
    illustration: "welcome",
    titleKey: "agentSystem",
    descKey: "agentSystemDesc",
  },
  {
    illustration: "reading",
    titleKey: "modelManagement",
    descKey: "modelManagementDesc",
  },
  {
    illustration: "files",
    titleKey: "mcpIntegration",
    descKey: "mcpIntegrationDesc",
  },
  {
    illustration: "reading",
    titleKey: "skillsSystem",
    descKey: "skillsSystemDesc",
  },
  {
    illustration: "message",
    titleKey: "feedbackSystem",
    descKey: "feedbackSystemDesc",
  },
  {
    illustration: "files",
    titleKey: "documentSupport",
    descKey: "documentSupportDesc",
  },
  {
    illustration: "files",
    titleKey: "realtimeStorage",
    descKey: "realtimeStorageDesc",
  },
  {
    illustration: "welcome",
    titleKey: "securityAuth",
    descKey: "securityAuthDesc",
  },
  {
    illustration: "reading",
    titleKey: "taskManagement",
    descKey: "taskManagementDesc",
  },
  {
    illustration: "message",
    titleKey: "channelsIntegrations",
    descKey: "channelsIntegrationsDesc",
  },
  {
    illustration: "reading",
    titleKey: "observability",
    descKey: "observabilityDesc",
  },
  {
    illustration: "welcome",
    titleKey: "frontendFeatures",
    descKey: "frontendFeaturesDesc",
  },
];

export const TECH_STACK = [
  {
    label: "Model Governance",
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    label: "MCP Control",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "Skills",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  {
    label: "RBAC",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    label: "Sandbox",
    color: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
  {
    label: "Feishu/Lark",
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
];

export const MAIN_SHOTS: ScreenshotItem[] = [
  { src: "/images/best-practice/login-page.webp", altKey: "loginPage" },
  { src: "/images/best-practice/register-page.webp", altKey: "registerPage" },
  {
    src: "/images/best-practice/reset-request-page.webp",
    altKey: "resetRequestPage",
  },
  {
    src: "/images/best-practice/verify-email-page.webp",
    altKey: "verifyEmailPage",
  },
  {
    src: "/images/best-practice/registration-pending-page.webp",
    altKey: "registrationPendingPage",
  },
  { src: "/images/best-practice/chat-home.webp", altKey: "chatInterface" },
  {
    src: "/images/best-practice/chat-response.webp",
    altKey: "streamingResponse",
  },
  { src: "/images/best-practice/share-dialog.webp", altKey: "shareDialog" },
];

export const MGMT_SHOTS: ScreenshotItem[] = [
  { src: "/images/best-practice/skills-page.webp", altKey: "skills" },
  {
    src: "/images/best-practice/marketplace-page.webp",
    altKey: "marketplace",
  },
  { src: "/images/best-practice/mcp-page.webp", altKey: "mcp" },
  { src: "/images/best-practice/agents-page.webp", altKey: "agents" },
  { src: "/images/best-practice/models-page.webp", altKey: "models" },
  { src: "/images/best-practice/channels-page.webp", altKey: "channels" },
  { src: "/images/best-practice/files-page.webp", altKey: "files" },
  { src: "/images/best-practice/persona-page.webp", altKey: "persona" },
  { src: "/images/best-practice/memory-page.webp", altKey: "memory" },
  {
    src: "/images/best-practice/notifications-page.webp",
    altKey: "notifications",
  },
  { src: "/images/best-practice/settings-page.webp", altKey: "settings" },
  { src: "/images/best-practice/feedback-page.webp", altKey: "feedback" },
  { src: "/images/best-practice/shared-page.webp", altKey: "shared" },
  { src: "/images/best-practice/roles-page.webp", altKey: "roles" },
  { src: "/images/best-practice/users-page.webp", altKey: "users" },
];

export const RESPONSIVE_SHOTS: ScreenshotItem[] = [
  { src: "/images/best-practice/mobile-view.webp", altKey: "mobile" },
  { src: "/images/best-practice/tablet-view.webp", altKey: "tablet" },
];

export const STATS = [
  { num: "14+", key: "settingCategories" },
  { num: "3", key: "agentTypes" },
  { num: "5", key: "languages" },
  { num: "3+", key: "oauthProviders" },
  { num: "SSE", key: "streamingOutput" },
];
