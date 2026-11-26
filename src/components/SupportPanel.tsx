import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CheckCircle2 } from 'lucide-react';

const TOPICS = [
  { value: 'billing',  label: 'Billing' },
  { value: 'bug',      label: 'Bug' },
  { value: 'data',     label: 'Data / prices' },
  { value: 'question', label: 'Question' },
  { value: 'other',    label: 'Other' },
];

const FAQS = [
  {
    q: 'How do I cancel my subscription?',
    a: 'Go to Settings → Subscription and click "Cancel subscription". Your access continues until the end of your current billing period — nothing is charged after that.',
  },
  {
    q: 'What happens when my trial ends?',
    a: 'Your trial converts automatically to a paid plan. You can cancel any time before the trial ends from Settings → Subscription with no charge.',
  },
  {
    q: 'What does the bias score mean?',
    a: "The bias is a composite signal that weighs price action, session structure, and macro conditions across your selected timeframes. A strong bias doesn't guarantee a move — it shows confluence.",
  },
  {
    q: 'Is the market data live or delayed?',
    a: 'Price data is real-time for major FX and index pairs. Some less-liquid instruments may carry a short delay. Economic calendar events are sourced from a third-party feed.',
  },
  {
    q: 'How are conditions counted in the checklist?',
    a: 'Each checklist item is a discrete condition (trend alignment, session break, news window, etc.). The count shows how many conditions are met for the selected direction and timeframe.',
  },
  {
    q: 'How do I change which timeframes are shown?',
    a: 'Open Settings → Preferences → Timeframes. You can enable or disable any timeframe and reorder them to match your trading style.',
  },
  {
    q: 'How do I contact billing support?',
    a: 'Use this form with the "Billing" topic and describe your issue. Pro and Founding Member subscribers receive a priority response.',
  },
  {
    q: "Why isn't my broker account syncing?",
    a: 'Go to Settings → Accounts and check that your connection is active. If it shows an error, try disconnecting and reconnecting. Broker sync is only available on paid plans after the trial converts.',
  },
];

type FormState = 'idle' | 'loading' | 'success' | 'error';

const MAX_MSG = 2000;
const MIN_MSG = 10;

interface SupportPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SupportPanel({ open, onClose }: SupportPanelProps) {
  const { session } = useAuth();
  const location = useLocation();

  const [topic,       setTopic]       = useState('');
  const [message,     setMessage]     = useState('');
  const [includePage, setIncludePage] = useState(true);
  const [formState,   setFormState]   = useState<FormState>('idle');
  const [errorMsg,    setErrorMsg]    = useState('');

  const msgLen   = message.length;
  const canSubmit = topic !== '' && msgLen >= MIN_MSG && msgLen <= MAX_MSG;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || formState === 'loading') return;

    setFormState('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          action: 'support',
          topic,
          message: message.trim(),
          page: includePage ? location.pathname : undefined,
        }),
      });

      const json = await res.json() as { ok?: boolean; error?: string };

      if (!res.ok) {
        const msg =
          json.error === 'rate_limit_exceeded'
            ? "You've sent several requests recently. Please wait an hour before trying again."
            : (json.error ?? 'Something went wrong. Please try again.');
        setErrorMsg(msg);
        setFormState('error');
        return;
      }

      setFormState('success');
    } catch {
      setErrorMsg('Could not reach the server. Check your connection and try again.');
      setFormState('error');
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      onClose();
      // Reset after the sheet's close animation
      setTimeout(() => {
        setTopic('');
        setMessage('');
        setIncludePage(true);
        setFormState('idle');
        setErrorMsg('');
      }, 300);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50 flex-shrink-0">
          <SheetTitle>Support</SheetTitle>
          <SheetDescription>
            We'll reply to your account email.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {formState === 'success' ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-sm font-medium text-foreground">We've got your message</p>
              <p className="text-sm text-muted-foreground">
                We'll reply to your account email.
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Topic */}
              <div className="space-y-1.5">
                <Label htmlFor="support-topic">Topic</Label>
                <Select value={topic} onValueChange={setTopic}>
                  <SelectTrigger id="support-topic">
                    <SelectValue placeholder="Select a topic…" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOPICS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <Label htmlFor="support-message">Message</Label>
                  <span
                    className={`text-[11px] tabular-nums ${
                      msgLen > MAX_MSG ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    {msgLen}/{MAX_MSG}
                  </span>
                </div>
                <Textarea
                  id="support-message"
                  placeholder="Describe what you need help with…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="resize-none"
                  maxLength={MAX_MSG + 1}
                />
                {msgLen > 0 && msgLen < MIN_MSG && (
                  <p className="text-[11px] text-muted-foreground">
                    {MIN_MSG - msgLen} more character{MIN_MSG - msgLen !== 1 ? 's' : ''} needed
                  </p>
                )}
              </div>

              {/* Include current page */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="support-page"
                  checked={includePage}
                  onCheckedChange={(v) => setIncludePage(Boolean(v))}
                />
                <Label htmlFor="support-page" className="text-sm font-normal cursor-pointer">
                  Include current page&nbsp;
                  <span className="text-muted-foreground">{location.pathname}</span>
                </Label>
              </div>

              {/* Error */}
              {formState === 'error' && errorMsg && (
                <p className="text-sm text-destructive">{errorMsg}</p>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                disabled={!canSubmit || formState === 'loading'}
              >
                {formState === 'loading' ? 'Sending…' : 'Send message'}
              </Button>
            </form>
          )}

          {/* Quick answers */}
          <div className="space-y-2 pb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Quick answers
            </p>
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-sm text-left hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        {/* Footer fallback */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            or email us at{' '}
            <a
              href="mailto:support@streambias.com"
              className="text-primary hover:underline"
            >
              support@streambias.com
            </a>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
