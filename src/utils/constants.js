// src/utils/constants.js

export const ROLES = {
  ADMIN: "admin",
  PM_MEMBER: "pm_member",
  PM_HEAD: "pm_head",
  CONTENT_LEAD: "content_lead",
  CONTENT_MEMBER: "content_member",
  DESIGN_LEAD: "design_lead",
  DESIGN_MEMBER: "design_member",
  VIDEO_LEAD: "video_lead",
  VIDEO_MEMBER: "video_member",
  SEO_LEAD: "seo_lead",
  SEO_MEMBER: "seo_member",
  SOCIAL_MEDIA_LEAD: "social_media_lead",
  SOCIAL_MEDIA_MEMBER: "social_media_member",
  CREATIVE_HEAD: "creative_head",
  ASSISTANT_MANAGER: "assistant_manager",
  AVP: "avp",
};

export const ROLE_LABELS = {
  admin: "Admin",
  pm_member: "Performance Marketing",
  pm_head: "Performance Marketing Head",
  content_lead: "Content Lead",
  content_member: "Content Member",
  design_lead: "Design Lead",
  design_member: "Design Member",
  video_lead: "Video Lead",
  video_member: "Video Member",
  seo_lead: "SEO Lead",
  seo_member: "SEO Member",
  social_media_lead: "Social Media Lead",
  social_media_member: "Social Media Member",
  creative_head: "Creative Head",
  assistant_manager: "Assistant Manager",
  avp: "AVP",
};

export const ROLE_TEAM_MAP = {
  pm_member: "performance_marketing",
  pm_head: "lead_1",
  content_lead: "lead_2",
  content_member: "content",
  design_lead: "lead_2",
  design_member: "design",
  video_lead: "lead_2",
  video_member: "video",
  seo_lead: "lead_2",
  seo_member: "seo",
  social_media_lead: "lead_2",
  social_media_member: "social_media",
  creative_head: "lead_1",
  assistant_manager: "lead_1",
  avp: "lead_1",
  admin: "lead_1",
};

export const TEAM_LABELS = {
  lead_1: "Lead 1",
  lead_2: "Lead 2",
  performance_marketing: "Performance Marketing",
  content: "Content",
  design: "Design",
  video: "Video",
  seo: "SEO",
  social_media: "Social Media",
};

export const TEAM_ORDER = [
  "lead_1",
  "lead_2",
  "performance_marketing",
  "content",
  "design",
  "video",
  "seo",
  "social_media",
];

export const TASK_TYPES = {
  PM_CONTENT_DESIGN: "pm_content_design",
  PM_CONTENT_VIDEO: "pm_content_video",
  EXTERNAL: "external",
};

export const TASK_TYPE_LABELS = {
  pm_content_design: "PM → Content + Design",
  pm_content_video: "PM → Content + Video",
  external: "External Work",
};

export const PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
};

export const PRIORITY_COLORS = {
  low:    { bg: "#e8f5e9", text: "#2e7d32" },
  medium: { bg: "#fff8e1", text: "#f57f17" },
  high:   { bg: "#fff3e0", text: "#e65100" },
  urgent: { bg: "#fce4ec", text: "#b71c1c" },
};

export const STAGE_LABELS = {
  initiated:            "Initiated",
  content_assigned:     "Content Assigned",
  content_in_progress:  "Content In Progress",
  content_review:       "Content Review",
  design_assigned:      "Design Assigned",
  design_in_progress:   "Design In Progress",
  design_review:        "Design Review",
  video_assigned:       "Video Assigned",
  video_in_progress:    "Video In Progress",
  video_review:         "Video Review",
  creative_review:      "Creative Review",
  delivered:            "Delivered",
  ext_initiated:        "Initiated",
  ext_in_progress:      "In Progress",
  ext_review:           "Under Review",
  ext_delivered:        "Delivered",
};

export const STAGE_COLORS = {
  initiated:            "#e3f2fd",
  content_assigned:     "#f3e5f5",
  content_in_progress:  "#e8eaf6",
  content_review:       "#fff9c4",
  design_assigned:      "#f3e5f5",
  design_in_progress:   "#e8eaf6",
  design_review:        "#fff9c4",
  video_assigned:       "#f3e5f5",
  video_in_progress:    "#e8eaf6",
  video_review:         "#fff9c4",
  creative_review:      "#fff9c4",
  delivered:            "#e8f5e9",
  ext_initiated:        "#e3f2fd",
  ext_in_progress:      "#e8eaf6",
  ext_review:           "#fff9c4",
  ext_delivered:        "#e8f5e9",
};

export const ALLOCATOR_ROLES = [
  ROLES.CONTENT_LEAD,
  ROLES.DESIGN_LEAD,
  ROLES.VIDEO_LEAD,
  ROLES.SEO_LEAD,
  ROLES.SOCIAL_MEDIA_LEAD,
  ROLES.CREATIVE_HEAD,
  ROLES.ASSISTANT_MANAGER,
  ROLES.AVP,
  ROLES.PM_HEAD,
  ROLES.ADMIN,
];

export const KANBAN_COLUMNS = [
  {
    key: "pending",
    label: "Pending Assignment",
    stages: ["initiated", "ext_initiated"],
  },
  {
    key: "active",
    label: "In Progress",
    // includes auto-routed "assigned" stages — member starts immediately
    stages: [
      "content_in_progress",
      "design_in_progress", "design_assigned",
      "video_in_progress",  "video_assigned",
      "ext_in_progress",
    ],
  },
  {
    key: "review",
    label: "Under Review",
    stages: ["content_review", "design_review", "video_review", "creative_review", "ext_review"],
  },
  {
    key: "revision",
    label: "Needs Revision",
    stages: ["content_rejected", "design_rejected", "video_rejected", "creative_rejected", "ext_rejected"],
  },
  {
    key: "done",
    label: "Delivered",
    stages: ["delivered", "ext_delivered"],
  },
];
