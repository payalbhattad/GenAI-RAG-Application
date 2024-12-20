"use client";

import React, { useEffect } from "react";
import { useEdgeRuntime } from "@assistant-ui/react";
import {
  Thread,
  ThreadWelcome,
  Composer,
  type ThreadConfig,
} from "@assistant-ui/react";
import { makeMarkdownText } from "@assistant-ui/react-markdown";
import {
  WebSpeechSynthesisAdapter,
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
} from "@assistant-ui/react";
import { ImageToolUI, ImageToolResult } from "./ImageToolUI";

const MarkdownText = makeMarkdownText();

// Define your custom ThreadWelcome component
function MyThreadWelcome() {
  return (
    <ThreadWelcome.Root>
      <ThreadWelcome.Center>
        <ThreadWelcome.Avatar />
        <ThreadWelcome.Message message="Welcome! How can I help you today?" />
      </ThreadWelcome.Center>
      <MyThreadWelcomeSuggestions />
    </ThreadWelcome.Root>
  );
}

// Define your custom ThreadWelcomeSuggestions component
function MyThreadWelcomeSuggestions() {
  return (
    <div className="aui-thread-welcome-suggestion-container">
      <ThreadWelcome.Suggestion
        suggestion={{
          prompt: "What is this book about?",
          text: "What is this book about?",
        }}
      />
      <ThreadWelcome.Suggestion
        suggestion={{
          prompt: "What is this chatbot about?",
          text: "What is this chatbot about?",
        }}
      />
    </div>
  );
}

// Define your custom Thread component
function MyThread(config: ThreadConfig) {
  return (
    <Thread.Root config={config}>
      <Thread.Viewport>
        <MyThreadWelcome />
        <Thread.Messages />
        <Thread.FollowupSuggestions />
        <Thread.ViewportFooter>
          <Thread.ScrollToBottom />
          <Composer />
        </Thread.ViewportFooter>
      </Thread.Viewport>
      <ImageToolUI />
      <ImageToolResult />
    </Thread.Root>
  );
}

// Main Assistant component
export function MyAssistant() {
  const runtime = useEdgeRuntime({
    api: "/api/chat",
    adapters: {
      speech: new WebSpeechSynthesisAdapter(),
      attachments: new CompositeAttachmentAdapter([
        new SimpleImageAttachmentAdapter(),
        new SimpleTextAttachmentAdapter(),
      ]),
    },
  });

  useEffect(() => {
    console.log("Assistant Runtime initialized:", runtime);
  }, [runtime]);

  return (
    <MyThread
      runtime={runtime}
      assistantMessage={{
        components: {
          Text: MarkdownText,
        },
      }}
    />
  );
}
