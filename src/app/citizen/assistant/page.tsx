'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Send,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Clock,
  HelpCircle,
  ChevronRight,
  CornerDownLeft,
} from 'lucide-react';
import { CitizenNav } from '@/components/layout/CitizenNav';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import {
  ChatMessage,
  processCivicMessage,
  SUGGESTED_QUESTIONS,
  ActionButton,
} from '@/lib/assistant';
import { getCategoryLabel, formatComplaintDate } from '@/lib/complaints';
import { ComplaintStatus } from '@/types';
import { cn } from '@/lib/utils';

const INITIAL_WELCOME_TIMESTAMP = '2026-10-13T09:00:00.000Z';

function generateMessageId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-1',
  role: 'assistant',
  content: `### Welcome to FixMyBharat Civic Assistant

Hello! I am your **FixMyBharat Civic Assistant**. I can help guide you through reporting civic issues, understanding department workflows, and checking your complaint statuses.

> **Transparency Notice**: I am a **deterministic, rule-based civic assistant** designed for FixMyBharat. I am not an external generative AI or LLM, and all guidance is based on verified municipal workflows.

Here are a few common topics you can ask me about:`,
  timestamp: INITIAL_WELCOME_TIMESTAMP,
  suggestedActions: [
    { label: 'How do I report a pothole?', query: 'How do I report a pothole?' },
    { label: 'What happens after I submit a complaint?', query: 'What happens after I submit a complaint?' },
    { label: 'How can I check my complaint status?', query: 'How can I check my complaint status?' },
    { label: 'What information should I include in a report?', query: 'What information should I include in a report?' },
    { label: 'Which department handles streetlights or water leakage?', query: 'Which department handles streetlights or water leakage?' },
    { label: 'Show my recent complaints', query: 'Show my recent complaints' },
  ],
};

/**
 * Lightweight, safe markdown block parser for assistant responses.
 * Renders headers, alerts, bold text, bullet points, inline code, and links.
 */
function FormattedAssistantContent({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-xs sm:text-sm text-slate-800 leading-relaxed break-words">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Emergency warning banner
        if (trimmed.startsWith('⚠️')) {
          return (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 font-medium space-y-1 my-2"
            >
              <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs sm:text-sm">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span>{trimmed.replace('⚠️', '').trim()}</span>
              </div>
            </div>
          );
        }

        // Header 3: ### Title
        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className="text-sm sm:text-base font-extrabold text-navy-950 mt-2 mb-1 tracking-tight"
            >
              {renderInlineSpans(trimmed.slice(4))}
            </h3>
          );
        }

        // Blockquote notice: > Text
        if (trimmed.startsWith('> ')) {
          return (
            <div
              key={idx}
              className="p-3 rounded-lg bg-sky-50 border-l-4 border-civic-500 text-sky-950 text-xs italic my-2"
            >
              {renderInlineSpans(trimmed.slice(2))}
            </div>
          );
        }

        // Bullet point: - Item or * Item
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-civic-600 font-bold mt-1 text-xs">•</span>
              <span className="flex-1">{renderInlineSpans(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered list: 1. Item
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="font-bold text-civic-700 text-xs mt-0.5 min-w-[16px]">
                {numMatch[1]}.
              </span>
              <span className="flex-1">{renderInlineSpans(numMatch[2])}</span>
            </div>
          );
        }

        return <p key={idx}>{renderInlineSpans(line)}</p>;
      })}
    </div>
  );
}

/**
 * Parses bold text (**text**), inline code (`code`), and markdown links ([text](url))
 */
function renderInlineSpans(text: string): React.ReactNode {
  // Regex to split by markdown links [label](url), bold **bold**, or code `code`
  const tokenRegex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Link: [label](href)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      const isInternal = href.startsWith('/');
      if (isInternal) {
        return (
          <Link
            key={index}
            href={href}
            className="text-civic-700 hover:text-civic-900 font-bold underline underline-offset-2 inline-flex items-center gap-0.5"
          >
            <span>{label}</span>
            <ArrowRight size={11} className="inline" />
          </Link>
        );
      }
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-civic-700 hover:text-civic-900 font-bold underline underline-offset-2 inline-flex items-center gap-0.5"
        >
          <span>{label}</span>
          <ExternalLink size={11} className="inline" />
        </a>
      );
    }

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-bold text-navy-950">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-slate-700">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Inline code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 text-navy-950 font-bold border border-slate-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

export default function CitizenAssistantPage() {
  const { user, profile, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Protected route
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirectTo=/citizen/assistant');
      } else if (role && role !== 'citizen') {
        router.push('/official');
      }
    }
  }, [user, role, authLoading, router]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isProcessing) return;

    const userMessage: ChatMessage = {
      id: generateMessageId('user'),
      role: 'user',
      content: text,
      timestamp: getCurrentTimestamp(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      const supabase = createClient();
      const response = await processCivicMessage(text, {
        userId: user?.id,
        userEmail: user?.email,
        userName: profile?.full_name || undefined,
        supabase,
      });

      const assistantMessage: ChatMessage = {
        id: generateMessageId('assistant'),
        role: 'assistant',
        content: response.reply,
        timestamp: getCurrentTimestamp(),
        suggestedActions: response.suggestedActions,
        complaintCards: response.complaintCards,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : 'Error processing request.';
      const errorMessage: ChatMessage = {
        id: generateMessageId('err'),
        role: 'assistant',
        content: `I encountered an unexpected issue while processing your question: ${errorText}. Please try again or use the navigation menu to access platform features directly.`,
        timestamp: getCurrentTimestamp(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  const handleActionClick = (action: ActionButton) => {
    if (action.href) {
      router.push(action.href);
    } else if (action.query) {
      handleSendMessage(action.query);
    }
  };

  const handleClearChat = () => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setInputValue('');
    inputRef.current?.focus();
  };

  if (authLoading || (!user && !role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingState message="Loading Civic Assistant..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <CitizenNav />

      <main className="flex-1 py-6 sm:py-8 flex flex-col">
        <Container size="lg" className="flex-1 flex flex-col space-y-4 max-w-4xl">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-civic-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                  <Bot size={18} />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-navy-950 tracking-tight">
                  FixMyBharat Civic Assistant
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-civic-50 text-civic-800 border border-civic-200">
                  <Sparkles size={11} className="text-civic-600" />
                  Rule-Based Engine
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Deterministic assistance for reporting issues, checking complaint workflows, and municipal routing.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearChat}
                leftIcon={<RotateCcw size={13} />}
                className="text-xs"
              >
                Clear Chat
              </Button>
            </div>
          </div>

          {/* Model Transparency & Safe Scope Banner */}
          <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200 text-sky-950 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-civic-600 shrink-0" />
              <span>
                <strong>Verified Guidance</strong>: Powered by FixMyBharat&apos;s deterministic rules engine. Never shares data with external AI providers or exposes private records.
              </span>
            </div>
            <Link
              href="/citizen/report"
              className="hidden md:inline-flex items-center gap-1 font-bold text-civic-700 hover:text-civic-900 shrink-0 text-xs"
            >
              <span>Report an Issue</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {/* Main Chat Interface Window */}
          <Card className="flex-1 flex flex-col border-slate-200 bg-white shadow-sm overflow-hidden min-h-[480px]">
            {/* Chat Messages Feed */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 max-h-[60vh] min-h-[380px] bg-slate-50/40">
              {messages.map((message) => {
                const isUser = message.role === 'user';

                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex items-start gap-3 max-w-[92%] sm:max-w-[85%]',
                      isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    )}
                  >
                    {/* Avatar */}
                    {!isUser ? (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-civic-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        <Bot size={16} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-navy-900 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 text-xs font-bold">
                        {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'You'}
                      </div>
                    )}

                    {/* Bubble Content */}
                    <div className="space-y-2 flex-1">
                      <div
                        className={cn(
                          'p-4 sm:p-5 rounded-2xl shadow-xs transition-all',
                          isUser
                            ? 'bg-navy-950 text-white rounded-tr-xs'
                            : message.isError
                            ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                        )}
                      >
                        {isUser ? (
                          <p className="text-xs sm:text-sm font-medium whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                        ) : (
                          <FormattedAssistantContent content={message.content} />
                        )}

                        {/* Embedded Safe Complaint Cards (if returned) */}
                        {message.complaintCards && message.complaintCards.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              Verified Complaints in Your Account ({message.complaintCards.length})
                            </span>
                            <div className="grid grid-cols-1 gap-2">
                              {message.complaintCards.map((c) => (
                                <div
                                  key={c.id}
                                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-civic-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono text-xs font-bold text-civic-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                        Report #{c.complaint_number}
                                      </span>
                                      <span className="text-[11px] font-semibold text-slate-600">
                                        {getCategoryLabel(c.category)}
                                      </span>
                                      <StatusBadge status={c.status as ComplaintStatus} />
                                    </div>
                                    <h4 className="text-xs font-bold text-navy-950 line-clamp-1">
                                      {c.title}
                                    </h4>
                                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                      <Clock size={11} />
                                      <span>Filed on {formatComplaintDate(c.created_at)}</span>
                                    </div>
                                  </div>

                                  <Link href={`/citizen/reports/${c.id}`} className="shrink-0">
                                    <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto">
                                      <span>Details</span>
                                      <ChevronRight size={13} className="ml-1" />
                                    </Button>
                                  </Link>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Suggested Action Buttons & Follow-Up Prompts */}
                      {message.suggestedActions && message.suggestedActions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {message.suggestedActions.map((act, aIdx) => (
                            <button
                              key={aIdx}
                              type="button"
                              onClick={() => handleActionClick(act)}
                              className={cn(
                                'text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all text-left flex items-center gap-1.5',
                                act.variant === 'primary'
                                  ? 'bg-civic-600 text-white border-civic-600 hover:bg-civic-700 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-civic-400 hover:bg-slate-50 hover:text-navy-950'
                              )}
                            >
                              <span>{act.label}</span>
                              {act.href ? (
                                <ArrowRight size={11} className="opacity-70" />
                              ) : (
                                <CornerDownLeft size={10} className="opacity-70" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Processing / Thinking Animation */}
              {isProcessing && (
                <div className="flex items-start gap-3 mr-auto max-w-[80%]">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-civic-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Bot size={16} />
                  </div>
                  <div className="p-4 rounded-2xl rounded-tl-xs bg-white border border-slate-200 text-slate-500 text-xs flex items-center gap-2 shadow-xs">
                    <span className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-civic-600 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-civic-600 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-civic-600 animate-bounce [animation-delay:0.4s]" />
                    </span>
                    <span>Checking FixMyBharat civic workflows...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Carousel Chips */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 shrink-0 flex items-center gap-1">
                <HelpCircle size={12} />
                <span>Suggestions:</span>
              </span>
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(q)}
                  disabled={isProcessing}
                  className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-navy-950 hover:border-civic-400 hover:bg-civic-50/50 text-[11px] font-medium whitespace-nowrap transition-colors shadow-2xs shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Bar Form */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask about reporting a pothole, tracking status, or departments..."
                    disabled={isProcessing}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-civic-500 focus:bg-white transition-all shadow-2xs"
                  />
                </div>

                <Button
                  type="submit"
                  variant="accent"
                  size="md"
                  disabled={isProcessing || !inputValue.trim()}
                  leftIcon={<Send size={15} />}
                  className="shrink-0"
                >
                  <span className="hidden sm:inline">Ask</span>
                </Button>
              </form>

              <div className="mt-2 text-center text-[10px] text-slate-400">
                FixMyBharat Civic Assistant provides deterministic rule-based guidance for civic issues. In life-threatening emergencies, dial <strong>112</strong> immediately.
              </div>
            </div>
          </Card>
        </Container>
      </main>
    </div>
  );
}
