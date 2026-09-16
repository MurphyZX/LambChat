/** @vitest-environment jsdom */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

vi.mock("../../../hooks/useFileUpload", () => ({
  useFileUpload: () => ({
    uploadFiles: vi.fn(),
    uploadFile: vi.fn(),
    uploadLimits: null,
    validateCount: () => true,
    cancelUpload: vi.fn(),
  }),
}));

vi.mock("../ChatInputToolbar", () => ({
  ChatInputToolbar: () => null,
}));

vi.mock("../ChatInputSelectors", () => ({
  ChatInputSelectors: () => null,
}));

import { ChatInput } from "../ChatInput";

beforeEach(() => {
  localStorage.clear();
});

function renderRunningInput() {
  const onSend = vi.fn();
  const onQueueFollowUp = vi.fn();
  const onSupplement = vi.fn();
  render(
    <ChatInput
      onSend={onSend}
      onStop={vi.fn()}
      onQueueFollowUp={onQueueFollowUp}
      onSupplement={onSupplement}
      isLoading={true}
      pendingInput="hello"
    />,
  );
  return { onSend, onQueueFollowUp, onSupplement };
}

test("Alt+Enter during a running session queues a follow-up turn", async () => {
  const { onSend, onQueueFollowUp, onSupplement } = renderRunningInput();

  const editor = await screen.findByRole("textbox");
  editor.focus();
  await act(async () => {
    fireEvent.keyDown(editor, { key: "Enter", code: "Enter", altKey: true });
  });

  expect(onQueueFollowUp).toHaveBeenCalledTimes(1);
  expect(onQueueFollowUp.mock.calls[0]?.slice(0, 2)).toEqual(["hello", []]);
  expect(onSend).not.toHaveBeenCalled();
  expect(onSupplement).not.toHaveBeenCalled();
  // 排队后草稿被清空，可继续输入下一条
  expect(editor).not.toHaveTextContent("hello");
});

test("Ctrl+Alt+Enter during a running session supplements the current question", async () => {
  const { onSend, onQueueFollowUp, onSupplement } = renderRunningInput();

  const editor = await screen.findByRole("textbox");
  editor.focus();
  await act(async () => {
    fireEvent.keyDown(editor, {
      key: "Enter",
      code: "Enter",
      altKey: true,
      ctrlKey: true,
    });
  });

  expect(onSupplement).toHaveBeenCalledTimes(1);
  expect(onSupplement.mock.calls[0]?.slice(0, 2)).toEqual(["hello", []]);
  expect(onQueueFollowUp).not.toHaveBeenCalled();
  expect(onSend).not.toHaveBeenCalled();
  expect(editor).not.toHaveTextContent("hello");
});

test("Alt+ArrowUp pops the last queued message back into the composer", async () => {
  const onCancelSteer = vi.fn();
  render(
    <ChatInput
      onSend={vi.fn()}
      onStop={vi.fn()}
      isLoading={true}
      onCancelSteer={onCancelSteer}
      steerMessages={[
        {
          id: "q1",
          content: "第一条追加",
          queued: true,
          status: "deferred",
          deferred: true,
          timestamp: new Date(1),
        },
        {
          id: "q2",
          content: "第二条追加",
          queued: true,
          status: "deferred",
          deferred: true,
          timestamp: new Date(2),
        },
      ]}
    />,
  );

  const editor = await screen.findByRole("textbox");
  editor.focus();
  await act(async () => {
    fireEvent.keyDown(editor, { key: "ArrowUp", code: "ArrowUp", altKey: true });
  });

  // 最后一条排队消息弹回输入框，并从队列移除
  expect(editor).toHaveTextContent("第二条追加");
  expect(onCancelSteer).toHaveBeenCalledWith("第二条追加", "q2");
});

test("queue chip edit button loads that message into the composer", async () => {
  const onCancelSteer = vi.fn();
  render(
    <ChatInput
      onSend={vi.fn()}
      onStop={vi.fn()}
      isLoading={true}
      onCancelSteer={onCancelSteer}
      steerMessages={[
        {
          id: "q1",
          content: "要改的追加",
          queued: true,
          status: "deferred",
          deferred: true,
          timestamp: new Date(1),
        },
      ]}
    />,
  );

  const editor = await screen.findByRole("textbox");
  fireEvent.click(screen.getByTestId("queue-edit-trigger"));

  expect(editor).toHaveTextContent("要改的追加");
  expect(onCancelSteer).toHaveBeenCalledWith("要改的追加", "q1");
});

test("plain Enter during a running session supplements the current question", async () => {
  localStorage.setItem("newlineModifier", "enter");
  const { onSend, onQueueFollowUp, onSupplement } = renderRunningInput();

  const editor = await screen.findByRole("textbox");
  editor.focus();
  await act(async () => {
    fireEvent.keyDown(editor, { key: "Enter", code: "Enter" });
  });

  expect(onSupplement).toHaveBeenCalledTimes(1);
  expect(onSupplement.mock.calls[0]?.slice(0, 2)).toEqual(["hello", []]);
  expect(onQueueFollowUp).not.toHaveBeenCalled();
  expect(onSend).not.toHaveBeenCalled();
});
