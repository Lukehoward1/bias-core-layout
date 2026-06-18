import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mb-8"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to home
        </button>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10"><strong>Last updated: 18 June 2026</strong></p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. Who we are</h2>
          <p className="text-muted-foreground mb-3">
            StreamBias is operated by Luke Howard, trading as StreamBias ("StreamBias," "we," "us," or "our"), of Howards Butchers, Lynn Road, Gayton, King's Lynn, PE32 1QJ.
          </p>
          <p className="text-muted-foreground mb-3 font-semibold">
            [PLACEHOLDER — UPDATE ON INCORPORATION]
          </p>
          <p className="text-muted-foreground mb-3 italic">
            Once "StreamBias Limited" is incorporated, replace the paragraph above with: StreamBias is operated by StreamBias Limited, a company registered in England and Wales under company number [COMPANY NUMBER], with its registered office at [REGISTERED ADDRESS] ("StreamBias," "we," "us," or "our").
          </p>
          <p className="text-muted-foreground mb-3">
            We are the data controller for the personal data described in this policy. Contact: support@streambias.com
          </p>
          <p className="text-muted-foreground">
            This policy explains what personal data we collect, why, and how we handle it in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. What data we collect</h2>
          <p className="text-muted-foreground mb-3">
            <strong className="text-foreground">2.1 Account data.</strong> When you register, we collect your email address and password (stored securely, hashed, via our authentication provider, Supabase). We do not see or store your plaintext password.
          </p>
          <p className="text-muted-foreground mb-3">
            <strong className="text-foreground">2.2 Subscription and billing data.</strong> When you subscribe, our payment processor Stripe collects and processes your payment card details and billing information directly. We do not store full card numbers. We retain a record of your subscription status, plan, and billing history as needed to administer your account.
          </p>
          <p className="text-muted-foreground mb-3">
            <strong className="text-foreground">2.3 Trading and journal data.</strong> Any trades, notes, ratings, risk settings, or account information you enter into the Journal, Risk Tools, or other features is stored in our database (hosted via Supabase) and is associated with your account.
          </p>
          <p className="text-muted-foreground mb-3">
            <strong className="text-foreground">2.4 Usage and analytics data.</strong> With your consent, we use Google Analytics 4 ("GA4") to understand how visitors use our website and Service. GA4 may collect your IP address, device and browser type, pages visited, and general usage patterns via cookies. See Section 5 (Cookies) below for details and how to manage your preferences.
          </p>
          <p className="text-muted-foreground mb-3">
            <strong className="text-foreground">2.5 Communications data.</strong> If you contact us for support, we retain the content of that correspondence to respond to you and improve the Service.
          </p>
          <p className="text-muted-foreground">
            <strong className="text-foreground">2.6 Demo/lead data.</strong> If you submit your email to access a demo video or similar gated content on our landing page, we store that email address to follow up with you about the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. How we use your data</h2>
          <p className="text-muted-foreground mb-3">We use your personal data to:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-2">
            <li>create and administer your account;</li>
            <li>provide, maintain, and improve the Service;</li>
            <li>process subscription payments and manage billing, trials, and renewals;</li>
            <li>send transactional emails (e.g. email confirmation, password reset, billing receipts, trial reminders) via our email provider, Resend;</li>
            <li>respond to support requests;</li>
            <li>where you have consented, analyse aggregate usage of our website to improve it;</li>
            <li>comply with our legal obligations and enforce our Terms of Service.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. Legal basis for processing</h2>
          <p className="text-muted-foreground mb-3">Under UK GDPR, we rely on the following legal bases:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-2">
            <li><strong className="text-foreground">Contract</strong> — processing your account, journal, and billing data is necessary to provide the Service you have subscribed to.</li>
            <li><strong className="text-foreground">Consent</strong> — for non-essential cookies and analytics (GA4), and for any marketing communications you opt into.</li>
            <li><strong className="text-foreground">Legitimate interests</strong> — for essential security, fraud prevention, and service-improvement purposes that do not require consent.</li>
            <li><strong className="text-foreground">Legal obligation</strong> — where we must retain records (e.g. financial/billing records) to comply with UK law.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. Cookies</h2>
          <p className="text-muted-foreground mb-3">
            <strong className="text-foreground">5.1 Essential cookies.</strong> We use essential cookies and similar technologies necessary for the Service to function, including authentication session cookies (Supabase) and payment-flow cookies (Stripe during checkout). These cannot be switched off, as the Service cannot function without them.
          </p>
          <p className="text-muted-foreground mb-3">
            <strong className="text-foreground">5.2 Analytics cookies (GA4).</strong> We use Google Analytics 4 to understand how visitors use our site. GA4 cookies are <strong className="text-foreground">not</strong> set until you give consent via the cookie banner shown on your first visit. You can change your preference at any time via the cookie settings link in the website footer. If you decline, GA4 will not load and no analytics cookies will be set.
          </p>
          <p className="text-muted-foreground mb-3">
            <strong className="text-foreground">5.3 Google as a data processor.</strong> GA4 is provided by Google. Usage data collected via GA4 may be processed by Google on servers outside the UK/EEA, including in the United States, under Google's standard contractual clauses and its role as a data processor. See{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google's Privacy Policy
            </a>{" "}
            for more detail on how Google handles this data.
          </p>
          <p className="text-muted-foreground">
            <strong className="text-foreground">5.4 Managing cookies.</strong> You can also control or delete cookies via your browser settings, though this may affect the functionality of the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. Third parties we share data with</h2>
          <p className="text-muted-foreground mb-4">
            We share personal data only with the service providers necessary to operate StreamBias, each acting as a data processor on our behalf:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-muted text-foreground">
                  <th className="text-left px-4 py-2 font-medium border-b border-border">Provider</th>
                  <th className="text-left px-4 py-2 font-medium border-b border-border">Purpose</th>
                  <th className="text-left px-4 py-2 font-medium border-b border-border">Data involved</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border">
                  <td className="px-4 py-2">Supabase</td>
                  <td className="px-4 py-2">Authentication, database hosting</td>
                  <td className="px-4 py-2">Account credentials, journal/trading data</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2">Stripe</td>
                  <td className="px-4 py-2">Payment processing, billing</td>
                  <td className="px-4 py-2">Payment details, billing history</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2">Resend</td>
                  <td className="px-4 py-2">Transactional email delivery</td>
                  <td className="px-4 py-2">Email address, name</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2">Google (GA4)</td>
                  <td className="px-4 py-2">Website analytics (consent-based)</td>
                  <td className="px-4 py-2">Usage data, IP address</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2">Twelve Data</td>
                  <td className="px-4 py-2">Market data (no personal data shared)</td>
                  <td className="px-4 py-2">N/A — market data only</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Financial Modeling Prep (FMP)</td>
                  <td className="px-4 py-2">Economic calendar data (no personal data shared)</td>
                  <td className="px-4 py-2">N/A — market data only</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground mt-4">
            We do not sell your personal data to third parties, and we do not share it for third-party advertising purposes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">7. International data transfers</h2>
          <p className="text-muted-foreground">
            Some of our service providers (including Stripe and Google) may process data outside the UK. Where this occurs, we rely on appropriate safeguards such as the UK's International Data Transfer Addendum or the EU Standard Contractual Clauses, as adopted by those providers.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">8. Data retention</h2>
          <p className="text-muted-foreground">
            We retain your account and trading data for as long as your account is active. If you close your account, we will delete or anonymise your personal data within a reasonable period, except where we are required to retain certain records (e.g. billing records) for legal or accounting purposes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">9. Your rights</h2>
          <p className="text-muted-foreground mb-3">Under UK GDPR, you have the right to:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-2 mb-3">
            <li>access the personal data we hold about you;</li>
            <li>request correction of inaccurate data;</li>
            <li>request deletion of your data ("right to be forgotten"), subject to legal retention requirements;</li>
            <li>object to or restrict certain processing;</li>
            <li>request a portable copy of your data;</li>
            <li>withdraw consent at any time (for consent-based processing such as GA4 analytics).</li>
          </ul>
          <p className="text-muted-foreground">
            To exercise any of these rights, contact us at support@streambias.com. You also have the right to lodge a complaint with the UK Information Commissioner's Office (ICO) at ico.org.uk.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">10. Data security</h2>
          <p className="text-muted-foreground">
            We use industry-standard measures to protect your data, including encrypted storage and transmission (via Supabase and Stripe's secure infrastructure) and access controls limiting who can view your data. No system is completely secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">11. Children's privacy</h2>
          <p className="text-muted-foreground">
            The Service is not directed at, and we do not knowingly collect data from, anyone under 18.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">12. Changes to this policy</h2>
          <p className="text-muted-foreground">
            We may update this Privacy Policy from time to time. Material changes will be notified by email or via a notice on the Service. The "Last updated" date at the top reflects the most recent revision.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">13. Contact</h2>
          <p className="text-muted-foreground">
            Questions about this Privacy Policy or how we handle your data can be sent to support@streambias.com. You can also contact the ICO directly if you have concerns about our data practices.
          </p>
        </section>
      </div>
    </div>
  );
}
