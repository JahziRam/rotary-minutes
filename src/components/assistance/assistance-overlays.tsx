"use client";

import { Suspense } from "react";
import { RoleFocusPrompt } from "./role-focus-prompt";
import { WalkthroughOverlay } from "./walkthrough-overlay";
import { AssistanceFeedbackButton } from "./assistance-feedback-button";

export function AssistanceOverlays() {
  return (
    <>
      <RoleFocusPrompt />
      <Suspense fallback={null}>
        <WalkthroughOverlay />
      </Suspense>
      <AssistanceFeedbackButton />
    </>
  );
}