"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Square, Bot, Plus, RotateCcw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ChatModel, DEFAULT_MODEL_ID, CHAT_ERROR_CODES } from "@/lib/ai/providers";
import { can, type Role } from "@/lib/rbac";
import { ChatMessage } from "./message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MODEL_STORAGE_KEY = "hari.chat.model";

// The codes the server emits (chat.errors.<code>). Single source of truth shared
// with the route via CHAT_ERROR_CODES; anything else → generic / network.
const KNOWN_ERROR_CODES = new Set<string>(CHAT_ERROR_CODES);

// Starter prompts, gated by capability so we never offer a role something its
// tools can't deliver (e.g. the team directory to a self-only employee).
function suggestionKeysFor(role: Role): string[] {
  return [
    "suggestion1", // handbook — everyone
    "suggestion2", // own leave balance — everyone
    can(role, "directory:read:team") ? "suggestion3" : "suggestionMyProfile",
    can(role, "leave:approve") ? "suggestionApprovals" : "suggestion4",
  ];
}

export function Chat({
  user,
  models,
}: {
  user: { name: string; role: Role };
  models: ChatModel[];
}) {
  const t = useTranslations("chat");
  const tRoles = useTranslations("roles");
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Whether the viewport is pinned to the bottom — so streaming tokens don't yank
  // the user back down while they're scrolled up reading.
  const pinnedRef = useRef(true);

  const { messages, sendMessage, status, stop, error, setMessages, regenerate, clearError } =
    useChat({
      transport: new DefaultChatTransport({ api: "/api/chat" }),
    });

  const busy = status === "submitted" || status === "streaming";
  const suggestionKeys = suggestionKeysFor(user.role);

  // Restore the previously chosen model (if it's still available in this env).
  // Done in an effect (not lazy state) so SSR and first client render agree —
  // localStorage only exists on the client; reading it here avoids a hydration
  // mismatch on the model selector.
  useEffect(() => {
    const saved = localStorage.getItem(MODEL_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage
    if (saved && models.some((m) => m.id === saved)) setModelId(saved);
  }, [models]);

  useEffect(() => {
    if (pinnedRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messages, status]);

  function onScroll() {
    const el = scrollRef.current;
    if (el) pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  function selectModel(value: string) {
    if (!value) return;
    setModelId(value);
    localStorage.setItem(MODEL_STORAGE_KEY, value);
  }

  function submit(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    pinnedRef.current = true; // sending should always scroll to the new message
    sendMessage({ text: value }, { body: { modelKey: modelId } });
    setInput("");
    inputRef.current?.focus(); // keep keyboard focus in the composer
  }

  function newChat() {
    stop();
    clearError();
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  }

  // Resolve the banner code: a known server code → that; otherwise an offline
  // browser → "network"; otherwise "generic". (Network/transport failures don't
  // carry a server code, so we infer connectivity rather than mislabel them.)
  const errorCode = !error
    ? null
    : KNOWN_ERROR_CODES.has(error.message)
      ? error.message
      : typeof navigator !== "undefined" && !navigator.onLine
        ? "network"
        : "generic";

  return (
    <div className="flex h-full flex-col">
      {/* Header: assistant + role, new-chat, model selector */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3 md:px-8">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Bot className="size-4 shrink-0 text-primary" />
          <span className="truncate font-medium">{t("assistant")}</span>
          <Badge variant="secondary" className="shrink-0">{tRoles(user.role)}</Badge>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {messages.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={newChat}
              aria-label={t("newChat")}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">{t("newChat")}</span>
            </Button>
          )}
          <Select value={modelId} onValueChange={(v) => v && selectModel(v)}>
            <SelectTrigger className="w-[150px] shrink-0 sm:w-[220px]" size="sm" aria-label={t("modelLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label} · {m.provider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
        <div
          role="log"
          aria-live="polite"
          aria-busy={busy}
          aria-label={t("conversation")}
          className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6"
        >
          {messages.length === 0 && (
            <div className="space-y-4 pt-10 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Bot className="size-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("greeting", { name: user.name.split(" ")[0] })}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("greetingDescription")}
                </p>
              </div>
              <div className="mx-auto grid max-w-md gap-2 sm:grid-cols-2">
                {suggestionKeys.map((key) => (
                  <button
                    key={key}
                    onClick={() => submit(t(key as Parameters<typeof t>[0]))}
                    className="rounded-lg border bg-card p-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {t(key as Parameters<typeof t>[0])}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <ChatMessage
              key={m.id}
              message={m}
              streaming={busy && i === messages.length - 1}
            />
          ))}

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <span className="flex-1">{t(`errors.${errorCode}` as Parameters<typeof t>[0])}</span>
              {errorCode === "session_expired" ? (
                // Retrying can't help an expired session — reload to re-authenticate.
                <Button size="sm" variant="ghost" onClick={() => window.location.reload()} className="h-7 text-destructive hover:text-destructive">
                  <RotateCcw className="size-3.5" /> {t("reload")}
                </Button>
              ) : (
                // Retry on the SAME model the user has selected (regenerate() alone
                // drops the body, silently falling back to the default model).
                <Button size="sm" variant="ghost" onClick={() => regenerate({ body: { modelKey: modelId } })} className="h-7 text-destructive hover:text-destructive">
                  <RotateCcw className="size-3.5" /> {t("retry")}
                </Button>
              )}
              <Button size="icon" variant="ghost" onClick={() => clearError()} aria-label={t("dismiss")} className="size-7 text-destructive hover:text-destructive">
                <X className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter newlines. Skip while an IME is composing.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit(input);
              }
            }}
            aria-label={t("messageLabel")}
            placeholder={t("placeholder")}
            rows={1}
            className="max-h-40 min-h-[44px] resize-none"
          />
          {busy ? (
            <Button
              size="icon"
              variant="secondary"
              onClick={() => stop()}
              aria-label={t("stop")}
              className="size-11 shrink-0"
            >
              <Square className="size-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={() => submit(input)}
              disabled={!input.trim()}
              aria-label={t("send")}
              className="size-11 shrink-0"
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
