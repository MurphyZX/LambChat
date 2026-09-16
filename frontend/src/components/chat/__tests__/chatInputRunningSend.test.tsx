/** @vitest-environment jsdom */

import { beforeEach, expect, test, vi } from "vitest";

import {
  createRunningDraftSender,
  handleEnterSubmit,
} from "../chatInputRunningSend";

type TestEvent = {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  preventDefault: ReturnType<typeof vi.fn>;
};

const enterEvent = (overrides: Partial<TestEvent> = {}): TestEvent => ({
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  preventDefault: vi.fn(),
  ...overrides,
});

const runningState = (overrides: Record<string, unknown> = {}) => ({
  isLoading: true,
  sendBlocked: false,
  input: "hello",
  visibleAttachments: [],
  hasUploadingAttachment: false,
  hasFailedAttachment: false,
  hasInvalidAttachment: false,
  ...overrides,
});

const actions = () => ({
  clearDraft: vi.fn(),
  openStopConfirm: vi.fn(),
  submitForm: vi.fn(),
});

beforeEach(() => {
  localStorage.clear();
});

test("Alt+Enter while running queues a follow-up instead of supplementing", () => {
  const onSupplement = vi.fn();
  const onQueueFollowUp = vi.fn();
  const act = actions();

  handleEnterSubmit(
    enterEvent({ altKey: true }) as never,
    runningState(),
    { onSupplement, onQueueFollowUp },
    act,
  );

  expect(onQueueFollowUp).toHaveBeenCalledWith("hello", []);
  expect(onSupplement).not.toHaveBeenCalled();
  expect(act.clearDraft).toHaveBeenCalled();
  expect(act.openStopConfirm).not.toHaveBeenCalled();
});

test("the send key while running supplements the current question", () => {
  const onSupplement = vi.fn();
  const onQueueFollowUp = vi.fn();
  const act = actions();

  handleEnterSubmit(
    enterEvent({ ctrlKey: true }) as never,
    runningState(),
    { onSupplement, onQueueFollowUp },
    act,
  );

  expect(onSupplement).toHaveBeenCalledWith("hello", []);
  expect(onQueueFollowUp).not.toHaveBeenCalled();
});

test("Alt held together with Ctrl still supplements (queue needs pure Alt+Enter)", () => {
  const onSupplement = vi.fn();
  const onQueueFollowUp = vi.fn();

  handleEnterSubmit(
    enterEvent({ altKey: true, ctrlKey: true }) as never,
    runningState(),
    { onSupplement, onQueueFollowUp },
    actions(),
  );

  expect(onSupplement).toHaveBeenCalledWith("hello", []);
  expect(onQueueFollowUp).not.toHaveBeenCalled();
});

test("Alt+Enter with an unsendable draft does not hijack the key", () => {
  const onSupplement = vi.fn();
  const onQueueFollowUp = vi.fn();
  const act = actions();
  const event = enterEvent({ altKey: true });

  handleEnterSubmit(
    event as never,
    runningState({ hasUploadingAttachment: true }),
    { onSupplement, onQueueFollowUp },
    act,
  );

  expect(event.preventDefault).not.toHaveBeenCalled();
  expect(onSupplement).not.toHaveBeenCalled();
  expect(onQueueFollowUp).not.toHaveBeenCalled();
  expect(act.openStopConfirm).not.toHaveBeenCalled();
});

test("sendBlocked suppresses supplementing and queueing entirely", () => {
  const onSupplement = vi.fn();
  const onQueueFollowUp = vi.fn();
  const act = actions();

  handleEnterSubmit(
    enterEvent({ altKey: true }) as never,
    runningState({ sendBlocked: true }),
    { onSupplement, onQueueFollowUp },
    act,
  );

  expect(onQueueFollowUp).not.toHaveBeenCalled();
  expect(onSupplement).not.toHaveBeenCalled();
  expect(act.openStopConfirm).not.toHaveBeenCalled();
});

test("idle Enter submits the form", () => {
  const onSupplement = vi.fn();
  const act = actions();

  handleEnterSubmit(
    enterEvent({ ctrlKey: true }) as never,
    runningState({ isLoading: false }),
    { onSupplement },
    act,
  );

  expect(act.submitForm).toHaveBeenCalled();
  expect(onSupplement).not.toHaveBeenCalled();
});

test("running Enter without a sendable draft opens the stop confirmation", () => {
  const onSupplement = vi.fn();
  const act = actions();

  handleEnterSubmit(
    enterEvent({ ctrlKey: true }) as never,
    runningState({ input: "  " }),
    { onSupplement },
    act,
  );

  expect(act.openStopConfirm).toHaveBeenCalled();
  expect(onSupplement).not.toHaveBeenCalled();
});

test("createRunningDraftSender sends the draft then clears it", () => {
  const send = vi.fn();
  const clearDraft = vi.fn();

  const sender = createRunningDraftSender("hello", [], clearDraft);
  const handler = sender(send);
  handler?.();

  expect(send).toHaveBeenCalledWith("hello", []);
  expect(clearDraft).toHaveBeenCalled();
  expect(sender(undefined)).toBeUndefined();
});
