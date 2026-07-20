// src/components/onboarding/OnboardingModal.tsx
// Shown on first login (profiles.onboarding_completed = false).
// Cannot be dismissed — must be completed to proceed.

import React, { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTraderStyle, type TraderStyle } from "@/context/TraderStyleProvider";
import { cn } from "@/lib/utils";

export function OnboardingModal() {
  const { user } = useAuth();
  const { traderStyle, setTraderStyle } = useTraderStyle();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [localStyle, setLocalStyle] = useState<TraderStyle>(traderStyle);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && !data.onboarding_completed) setOpen(true);
      });
  }, [user]);

  async function handleSubmit() {
    if (!user || !fullName.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), trader_style: localStyle, onboarding_completed: true })
        .eq("id", user.id);
      if (error) {
        console.error("[OnboardingModal] Failed to save:", error.message);
        return;
      }
      setTraderStyle(localStyle);
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={() => {}}>
      <DialogPortal>
        <DialogOverlay zIndex={9010} />
        <DialogPrimitive.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          style={{ zIndex: 9011 }}
          className={cn(
            "fixed left-[50%] top-[50%] w-full max-w-md translate-x-[-50%] translate-y-[-50%]",
            "border bg-background shadow-lg sm:rounded-lg",
            "p-6 space-y-6",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          )}
        >
          <div className="space-y-1">
            <DialogPrimitive.Title className="text-xl font-semibold">
              Welcome to StreamBias
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              Let's get you set up before you dive in.
            </DialogPrimitive.Description>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="onboarding-name">Display Name</Label>
              <Input
                id="onboarding-name"
                type="text"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && fullName.trim()) void handleSubmit(); }}
              />
              <p className="text-xs text-muted-foreground">
                Shown in the "Welcome, …" greeting on your Dashboard.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="onboarding-style">Trader Style</Label>
              <Select value={localStyle} onValueChange={(v) => setLocalStyle(v as TraderStyle)}>
                <SelectTrigger id="onboarding-style">
                  <SelectValue placeholder="Select trader style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scalper">Scalper</SelectItem>
                  <SelectItem value="intraday">Intraday</SelectItem>
                  <SelectItem value="swing">Swing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => void handleSubmit()}
            disabled={!fullName.trim() || submitting}
            className="w-full"
          >
            {submitting ? "Saving…" : "Continue"}
          </Button>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
