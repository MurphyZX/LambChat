import type { KeyboardEvent } from "react";

import { isSendEnterKey } from "../../hooks/sendModifier";
import type { MessageAttachment } from "../../types";
import { filterSendableAttachments } from "./attachmentValidation";

export interface RunningDraftState {
  isLoading: boolean;
  sendBlocked: boolean;
  input: string;
  visibleAttachments: MessageAttachment[];
  hasUploadingAttachment: boolean;
  hasFailedAttachment: boolean;
  hasInvalidAttachment: boolean;
}

export interface RunningSendHandlers {
  /** 补充当前问题：打断本条回答，结合新内容重新思考 */
  onSupplement?: (content: string, attachments?: MessageAttachment[]) => void;
  /** 追加提问（Codex Tab-queue）：本轮结束后自动作为新消息发送 */
  onQueueFollowUp?: (
    content: string,
    attachments?: MessageAttachment[],
  ) => void;
}

interface EnterSubmitActions {
  clearDraft: () => void;
  openStopConfirm: () => void;
  submitForm: () => void;
}

export function isRunningDraftSendable(state: RunningDraftState): boolean {
  return (
    (!!state.input.trim() || state.visibleAttachments.length > 0) &&
    !state.hasUploadingAttachment &&
    !state.hasFailedAttachment &&
    !state.hasInvalidAttachment
  );
}

/** Alt+Enter（不叠 Ctrl/Cmd）是否应走追加提问（运行中、草稿可发送且有回调） */
export function canQueueFollowUp(
  event: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey">,
  state: RunningDraftState,
  onQueueFollowUp?: RunningSendHandlers["onQueueFollowUp"],
): boolean {
  return (
    !!onQueueFollowUp &&
    event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    state.isLoading &&
    isRunningDraftSendable(state)
  );
}

/** 执行运行中分流：发送草稿并清空输入；草稿不可发送/无回调时返回 false */
export function dispatchRunningEnterAction(
  event: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey">,
  state: RunningDraftState,
  handlers: RunningSendHandlers,
  clearDraft: () => void,
): boolean {
  if (!isRunningDraftSendable(state)) return false;
  const queue = canQueueFollowUp(event, state, handlers.onQueueFollowUp);
  const send = queue ? handlers.onQueueFollowUp : handlers.onSupplement;
  if (!send) return false;
  send(state.input, filterSendableAttachments(state.visibleAttachments));
  clearDraft();
  return true;
}

/**
 * Enter 按键的统一去向：空闲 → 表单提交；运行中 → 发送键补充当前问题
 * （打断本条回答，结合新内容重新思考）、Alt+Enter 追加提问（本轮结束
 * 后作为新消息发送，优先于 Enter/Ctrl/Shift 发送偏好）、草稿不可发送
 * → 停止确认。
 */
export function handleEnterSubmit(
  event: KeyboardEvent<HTMLDivElement>,
  state: RunningDraftState,
  handlers: RunningSendHandlers,
  actions: EnterSubmitActions,
): void {
  const altQueue = canQueueFollowUp(event, state, handlers.onQueueFollowUp);
  if (!altQueue && !isSendEnterKey(event)) return;
  event.preventDefault();
  if (state.sendBlocked) return;
  if (!state.isLoading) {
    actions.submitForm();
    return;
  }
  if (!dispatchRunningEnterAction(event, state, handlers, actions.clearDraft)) {
    actions.openStopConfirm();
  }
}

/** 运行中发送（补充 / 追加提问）共用的草稿发送器工厂 */
export function createRunningDraftSender(
  input: string,
  visibleAttachments: MessageAttachment[],
  clearDraft: () => void,
) {
  return (
    send?: (content: string, attachments?: MessageAttachment[]) => void,
  ) =>
    send &&
    (() => {
      send(input, filterSendableAttachments(visibleAttachments));
      clearDraft();
    });
}
