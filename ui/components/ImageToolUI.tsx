"use client";
import React from "react";
import { makeAssistantToolUI, makeAssistantTool } from "@assistant-ui/react";

type ImageToolArgs = {
  prompt: string;
};

type ImageToolResult = {
  imageUrl: string;
};

export const ImageToolUI = makeAssistantToolUI<ImageToolArgs, ImageToolResult>({
  toolName: "ImageGenerationTool",
  render: (props) => {
    return <p>Generating image for: {props.args.prompt}</p>;
  },
});

export const ImageToolResult = makeAssistantTool<ImageToolArgs, ImageToolResult>({
  toolName: "ImageGenerationTool",
  parameters: {
    properties: {
      imageUrl: { type: "string" }
    }
  },
  render: (props) => {
    if (!props.result?.imageUrl) return null;

    return (
      <img
        src={props.result.imageUrl}
        alt="Generated"
        style={{
          maxWidth: '100%',
          maxHeight: '400px',
          objectFit: 'contain'
        }}
      />
    );
  }
});