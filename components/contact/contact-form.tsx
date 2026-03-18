"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ContactForm() {
  const [contactStatus, setContactStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [contactError, setContactError] = useState<string | null>(null);

  async function handleContactSubmit(formData: FormData) {
    if (contactStatus === "submitting") return;
    setContactStatus("submitting");
    setContactError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
          website: formData.get("website")
        })
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setContactError(data?.error || "Something went wrong. Please try again later.");
        setContactStatus("error");
        return;
      }

      setContactStatus("success");
    } catch {
      setContactError("Something went wrong. Please try again later.");
      setContactStatus("error");
    }
  }

  return (
    <section aria-label="Contact" className="rounded-lg border border-input bg-card px-4 py-3 text-sm">
      <p className="mb-2 text-sm font-medium">Spotted an error or missing class?</p>
      <p className="mb-3 text-xs text-muted-foreground">
        This is a hobby project maintained by a single developer. If something looks wrong, you can send a quick note
        below and I&apos;ll try to fix it when I can.
      </p>
      <form
        className="grid gap-2 md:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          await handleContactSubmit(new FormData(form));
          if (contactStatus === "success") {
            form.reset();
          }
        }}
      >
        <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
        <div className="space-y-1">
          <label htmlFor="contact-name" className="text-xs font-medium text-muted-foreground">
            Name (optional)
          </label>
          <Input id="contact-name" name="name" type="text" autoComplete="name" />
        </div>
        <div className="space-y-1">
          <label htmlFor="contact-email" className="text-xs font-medium text-muted-foreground">
            Email (optional, only if you&apos;d like a reply)
          </label>
          <Input id="contact-email" name="email" type="email" autoComplete="email" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label htmlFor="contact-message" className="text-xs font-medium text-muted-foreground">
            Message
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            rows={3}
            className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          <Button type="submit" size="sm" disabled={contactStatus === "submitting"}>
            {contactStatus === "submitting" ? "Sending..." : "Send feedback"}
          </Button>
          {contactStatus === "success" && <span className="text-xs text-emerald-600">Thanks - your message has been sent.</span>}
          {contactStatus === "error" && contactError && <span className="text-xs text-destructive">{contactError}</span>}
        </div>
      </form>
    </section>
  );
}
