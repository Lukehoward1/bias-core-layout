import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function Terms() {
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

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
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
          <p className="text-muted-foreground mb-3">Contact: support@streambias.com</p>
          <p className="text-muted-foreground">
            These Terms of Service ("Terms") govern your access to and use of the StreamBias website, dashboard, and related services (the "Service"). By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. Not financial advice</h2>
          <p className="text-muted-foreground mb-3">
            StreamBias provides market bias signals, economic calendar data, journaling tools, and risk-management calculators for informational and educational purposes only.
          </p>
          <p className="text-muted-foreground mb-3">
            <strong className="text-foreground">Nothing on the Service constitutes financial, investment, trading, or other professional advice.</strong> StreamBias does not recommend that any financial instrument, strategy, or transaction is suitable for you. The bias engine, confidence scores, and any other analytics are generated from historical and live market data using automated technical analysis; they are not predictions of future price movement and carry no guarantee of accuracy.
          </p>
          <p className="text-muted-foreground mb-3">
            Trading foreign exchange, contracts for difference, and other leveraged financial instruments carries a high level of risk and may not be suitable for all investors. You could lose some or all of your invested capital. You should not trade with money you cannot afford to lose, and you should seek independent financial advice from an authorised professional before making any trading decision.
          </p>
          <p className="text-muted-foreground">
            You are solely responsible for your own trading decisions and any resulting profit or loss. StreamBias, its operator, and its staff accept no liability for trading losses incurred while using, or as a result of using, the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. Eligibility</h2>
          <p className="text-muted-foreground">
            You must be at least 18 years old and capable of forming a binding contract to use the Service. By registering, you confirm that you meet these requirements.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. Accounts</h2>
          <p className="text-muted-foreground">
            You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. Notify us promptly at support@streambias.com if you suspect unauthorised access. We may suspend or terminate accounts that provide false information, violate these Terms, or are used for unlawful purposes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. Subscriptions, trials, and billing</h2>
          <p className="text-muted-foreground mb-3">
            <strong className="text-foreground">5.1 Plans.</strong> StreamBias is offered on a subscription basis with the following tiers, as described on our Pricing page:
          </p>
          <ul className="list-disc list-inside text-muted-foreground mb-3 space-y-1 pl-2">
            <li><strong className="text-foreground">Standard</strong> — £19/month or £190/year</li>
            <li><strong className="text-foreground">Pro</strong> — £29/month or £290/year</li>
            <li><strong className="text-foreground">Founding Member</strong> — £197/year, available only to the first 100 members, locked at this price for the lifetime of the subscription as long as it remains continuously active</li>
          </ul>
          <p className="text-muted-foreground mb-3">
            <strong className="text-foreground">5.2 Free trial.</strong> Standard and Pro plans include a 7-day free trial. A valid payment card is required to start a trial. If you do not cancel before the end of the 7-day trial period, your card will be charged the applicable subscription fee and your subscription will continue on a recurring basis until cancelled.
          </p>
          <p className="text-muted-foreground mb-3">
            <strong className="text-foreground">5.3 Founding Member.</strong> The Founding Member plan does not include a free trial. Your card will be charged the full annual fee immediately upon purchase.
          </p>
          <p className="text-muted-foreground mb-3">
            <strong className="text-foreground">5.4 Recurring billing.</strong> Subscriptions renew automatically at the end of each billing period (monthly or annually, depending on your plan) until you cancel. You authorise us, via our payment processor Stripe, to charge your payment method on file for each renewal.
          </p>
          <p className="text-muted-foreground mb-3">
            <strong className="text-foreground">5.5 Cancellation.</strong> You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period; we do not provide partial-period refunds except where required by law. If you cancel during a free trial before it ends, you will not be charged.
          </p>
          <p className="text-muted-foreground mb-3">
            <strong className="text-foreground">5.6 Price changes.</strong> We may change subscription prices for future billing periods. We will give you reasonable notice before any price increase takes effect on your account. Founding Member pricing is fixed for the duration of a continuous, uninterrupted subscription and will not increase.
          </p>
          <p className="text-muted-foreground">
            <strong className="text-foreground">5.7 Payment processing.</strong> All payments are processed by Stripe, Inc. We do not store your full card details. Use of Stripe's services is subject to the{" "}
            <a
              href="https://stripe.com/legal/ssa"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Stripe Services Agreement
            </a>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. Acceptable use</h2>
          <p className="text-muted-foreground mb-3">You agree not to:</p>
          <ul className="list-disc list-inside text-muted-foreground mb-3 space-y-1 pl-2">
            <li>use the Service for any unlawful purpose or in violation of any applicable regulation;</li>
            <li>attempt to gain unauthorised access to the Service, other accounts, or our systems;</li>
            <li>scrape, reverse-engineer, resell, or redistribute the Service or its data feeds without our written consent;</li>
            <li>use automated means to access the Service in a manner that places unreasonable load on our infrastructure;</li>
            <li>misrepresent your identity or share your account with others in a way that circumvents per-seat or per-account pricing.</li>
          </ul>
          <p className="text-muted-foreground">We may suspend or terminate your access if you breach this section.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">7. Intellectual property</h2>
          <p className="text-muted-foreground">
            The Service, including its software, design, bias-engine methodology, and content (excluding third-party market data), is owned by StreamBias or its licensors and protected by copyright and other intellectual property laws. We grant you a limited, non-exclusive, non-transferable licence to use the Service for your personal, non-commercial trading-analysis purposes during your subscription term.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">8. Third-party data and services</h2>
          <p className="text-muted-foreground">
            The Service incorporates market data and economic calendar data from third-party providers (currently Twelve Data and Financial Modeling Prep). We do not control and are not responsible for the accuracy, completeness, or timeliness of third-party data. Data may be delayed, interrupted, or contain errors.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">9. Disclaimers</h2>
          <p className="text-muted-foreground">
            The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">10. Limitation of liability</h2>
          <p className="text-muted-foreground mb-3">
            To the maximum extent permitted by law, StreamBias and its operator shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or trading losses, arising from or related to your use of the Service, even if advised of the possibility of such damages.
          </p>
          <p className="text-muted-foreground">
            Nothing in these Terms excludes or limits liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded or limited under English law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">11. Termination</h2>
          <p className="text-muted-foreground">
            We may suspend or terminate your access to the Service at any time for breach of these Terms, non-payment, or suspected fraudulent or unlawful activity. You may stop using the Service and cancel your subscription at any time as described in Section 5.5.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">12. Changes to these Terms</h2>
          <p className="text-muted-foreground">
            We may update these Terms from time to time. If we make material changes, we will notify you by email or via a notice on the Service. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">13. Governing law</h2>
          <p className="text-muted-foreground">
            These Terms are governed by the laws of England and Wales. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts of England and Wales.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">14. Contact</h2>
          <p className="text-muted-foreground">
            Questions about these Terms can be sent to support@streambias.com.
          </p>
        </section>
      </div>
    </div>
  );
}
