import type { ActionType } from "@instagram-agent/db";

/** Human-readable one-liner shown in the approval queue / notification body. */
export function summarizeAction(actionType: ActionType, payload: Record<string, unknown>): string {
  switch (actionType) {
    case "PUBLISH_CONTENT":
      return `نشر محتوى (Content #${payload["contentId"]})`;
    case "REPLY_COMMENT":
      return `رد على تعليق: "${payload["message"]}"`;
    case "HIDE_COMMENT":
      return `${payload["hide"] ? "إخفاء" : "إظهار"} تعليق`;
    case "DELETE_COMMENT":
      return "حذف تعليق";
    case "SEND_DM":
      return `إرسال رسالة خاصة: "${payload["message"]}"`;
    case "GENERATE_CONTENT":
      return `توليد محتوى عن: ${payload["topic"]}`;
    case "ESCALATE":
      return `تصعيد: ${payload["reason"]}`;
    default:
      return actionType;
  }
}
