import { useCallback } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportOptions {
  filename: string;
  title: string;
  dateRange: string;
  userName?: string;
  userAvatar?: string;
  trades?: {
    totalPnl: number;
    winRate: number;
    avgRR: number;
    tradeCount: number;
    bestDay: { date: string; pnl: number } | null;
    worstDay: { date: string; pnl: number } | null;
  };
}

// Sanitize user inputs to prevent XSS
const escapeHtml = (str: string) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

const createPdfStyles = () => `
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fafafa; }
    
    .pdf-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #27272a;
      background: linear-gradient(135deg, #0a0a0a 0%, #18181b 100%);
    }
    
    .pdf-logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .pdf-logo-mark {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
      color: #0a0a0a;
    }
    
    .pdf-logo-text {
      font-size: 20px;
      font-weight: 700;
      color: #fafafa;
      letter-spacing: -0.5px;
    }
    
    .pdf-user-info {
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: right;
    }
    
    .pdf-user-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .pdf-user-name {
      font-size: 14px;
      font-weight: 600;
      color: #fafafa;
    }
    
    .pdf-report-type {
      font-size: 11px;
      color: #a1a1aa;
    }
    
    .pdf-date-range {
      font-size: 10px;
      color: #71717a;
    }
    
    .pdf-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 16px;
      color: #0a0a0a;
      border: 2px solid #27272a;
    }
    
    .pdf-summary-strip {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 12px;
      padding: 16px 24px;
      background: #18181b;
      border-bottom: 1px solid #27272a;
    }
    
    .pdf-kpi-card {
      background: #0a0a0a;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    
    .pdf-kpi-label {
      font-size: 9px;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .pdf-kpi-value {
      font-size: 16px;
      font-weight: 700;
      color: #fafafa;
    }
    
    .pdf-kpi-value.positive { color: #22c55e; }
    .pdf-kpi-value.negative { color: #ef4444; }
    
    .pdf-section-title {
      font-size: 14px;
      font-weight: 600;
      color: #06b6d4;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 16px 24px 8px;
      border-bottom: 1px solid #27272a;
      margin-top: 20px;
    }
    
    .pdf-content {
      padding: 20px 24px;
    }
    
    .pdf-highlights {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
    }
    
    .pdf-highlights-title {
      font-size: 11px;
      font-weight: 600;
      color: #a1a1aa;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    
    .pdf-highlight-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #d4d4d8;
      margin-bottom: 8px;
    }
    
    .pdf-highlight-item:last-child { margin-bottom: 0; }
    
    .pdf-highlight-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #06b6d4;
      flex-shrink: 0;
    }
    
    .pdf-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 24px;
      border-top: 1px solid #27272a;
      background: #0a0a0a;
      font-size: 9px;
      color: #71717a;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
    }
    
    .pdf-footer-left { }
    .pdf-footer-center { color: #06b6d4; }
    .pdf-footer-right { }
    
    .pdf-page-break {
      page-break-before: always;
      break-before: page;
    }
    
    .pdf-mini-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 24px;
      border-bottom: 1px solid #27272a;
      background: #0a0a0a;
    }
    
    .pdf-mini-logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .pdf-mini-logo-mark {
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 11px;
      color: #0a0a0a;
    }
    
    .pdf-mini-logo-text {
      font-size: 14px;
      font-weight: 600;
      color: #fafafa;
    }
    
    .pdf-mini-user {
      font-size: 11px;
      color: #a1a1aa;
    }
  </style>
`;

const createPdfHeader = (options: ExportOptions) => {
  const safeName = escapeHtml(options.userName || 'Trader');
  const safeDateRange = escapeHtml(options.dateRange);
  const initials = options.userName 
    ? options.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'JT';
  
  return `
    <div class="pdf-header">
      <div class="pdf-logo">
        <div class="pdf-logo-mark">SB</div>
        <div class="pdf-logo-text">StreamBias</div>
      </div>
      <div class="pdf-user-info">
        <div class="pdf-user-details">
          <div class="pdf-user-name">${safeName}</div>
          <div class="pdf-report-type">Trading Performance Report</div>
          <div class="pdf-date-range">Period: ${safeDateRange}</div>
        </div>
        <div class="pdf-avatar">${escapeHtml(initials)}</div>
      </div>
    </div>
  `;
};

const createSummaryStrip = (trades?: ExportOptions['trades']) => {
  if (!trades) return '';
  
  const formatPnl = (pnl: number) => {
    const prefix = pnl >= 0 ? '+' : '';
    return `${prefix}£${pnl.toLocaleString()}`;
  };
  
  return `
    <div class="pdf-summary-strip">
      <div class="pdf-kpi-card">
        <div class="pdf-kpi-label">Total P&L</div>
        <div class="pdf-kpi-value ${trades.totalPnl >= 0 ? 'positive' : 'negative'}">${formatPnl(trades.totalPnl)}</div>
      </div>
      <div class="pdf-kpi-card">
        <div class="pdf-kpi-label">Win Rate</div>
        <div class="pdf-kpi-value">${trades.winRate.toFixed(1)}%</div>
      </div>
      <div class="pdf-kpi-card">
        <div class="pdf-kpi-label">Avg R:R</div>
        <div class="pdf-kpi-value">${trades.avgRR.toFixed(2)}</div>
      </div>
      <div class="pdf-kpi-card">
        <div class="pdf-kpi-label">Trades</div>
        <div class="pdf-kpi-value">${trades.tradeCount}</div>
      </div>
      <div class="pdf-kpi-card">
        <div class="pdf-kpi-label">Best Day</div>
        <div class="pdf-kpi-value positive">${trades.bestDay ? formatPnl(trades.bestDay.pnl) : 'N/A'}</div>
      </div>
      <div class="pdf-kpi-card">
        <div class="pdf-kpi-label">Worst Day</div>
        <div class="pdf-kpi-value negative">${trades.worstDay ? formatPnl(trades.worstDay.pnl) : 'N/A'}</div>
      </div>
    </div>
  `;
};

const createMiniHeader = (options: ExportOptions) => {
  const safeName = escapeHtml(options.userName || 'Trader');
  const safeDateRange = escapeHtml(options.dateRange);
  
  return `
    <div class="pdf-mini-header">
      <div class="pdf-mini-logo">
        <div class="pdf-mini-logo-mark">SB</div>
        <div class="pdf-mini-logo-text">StreamBias</div>
      </div>
      <div class="pdf-mini-user">${safeName} • ${safeDateRange}</div>
    </div>
  `;
};

async function renderToPdf(wrapper: HTMLElement, filename: string): Promise<void> {
  // Temporarily add to DOM
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.width = '800px';
  document.body.appendChild(wrapper);

  try {
    // Use html2canvas to capture
    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0a0a0a',
      logging: false,
    });

    // Calculate PDF dimensions
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let heightLeft = imgHeight;
    let position = 0;
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Add first page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${filename}.pdf`);
  } finally {
    document.body.removeChild(wrapper);
  }
}

export function usePdfExport() {
  const exportToPdf = useCallback(async (elementId: string, options: ExportOptions) => {
    const element = document.getElementById(elementId);
    if (!element) {
      if (import.meta.env.DEV) {
        console.error(`Element with id "${elementId}" not found`);
      }
      return;
    }

    const safeTitle = escapeHtml(options.title);

    // Create the full PDF wrapper
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      ${createPdfStyles()}
      <div style="background: #0a0a0a; color: #fafafa; min-height: 100vh;">
        ${createPdfHeader(options)}
        ${createSummaryStrip(options.trades)}
        <div class="pdf-section-title">${safeTitle}</div>
        <div class="pdf-content" id="pdf-cloned-content"></div>
      </div>
    `;
    
    // Clone and append the content
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-pdf-exclude]').forEach(el => el.remove());
    
    // Style adjustments for PDF
    clone.style.cssText = 'background: transparent;';
    
    const contentContainer = wrapper.querySelector('#pdf-cloned-content');
    if (contentContainer) {
      contentContainer.appendChild(clone);
    }

    await renderToPdf(wrapper, options.filename);
  }, []);

  const exportAllReports = useCallback(async (
    elements: { id: string; title: string; highlights?: string[] }[], 
    options: { filename: string; dateRange: string; userName?: string; trades?: ExportOptions['trades'] }
  ) => {
    const wrapper = document.createElement('div');
    
    // Build the full document
    let htmlContent = `
      ${createPdfStyles()}
      <div style="background: #0a0a0a; color: #fafafa; min-height: 100vh;">
        ${createPdfHeader({ ...options, title: 'Complete Trading Report', filename: options.filename })}
        ${createSummaryStrip(options.trades)}
    `;

    // Add each section
    elements.forEach((section, index) => {
      const element = document.getElementById(section.id);
      if (element) {
        const clone = element.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('[data-pdf-exclude]').forEach(el => el.remove());
        
        const safeTitle = escapeHtml(section.title);
        
        // Add page break for sections after the first
        const pageBreak = index > 0 ? 'class="pdf-page-break"' : '';
        
        htmlContent += `
          <div ${pageBreak}>
            ${index > 0 ? createMiniHeader({ ...options, title: section.title, filename: options.filename }) : ''}
            <div class="pdf-section-title">${safeTitle.toUpperCase()}</div>
            <div class="pdf-content">
              ${clone.outerHTML}
              ${section.highlights ? `
                <div class="pdf-highlights">
                  <div class="pdf-highlights-title">Key Highlights</div>
                  ${section.highlights.map(h => `
                    <div class="pdf-highlight-item">
                      <div class="pdf-highlight-dot"></div>
                      <span>${escapeHtml(h)}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }
    });

    htmlContent += '</div>';
    wrapper.innerHTML = htmlContent;

    await renderToPdf(wrapper, options.filename);
  }, []);

  return { exportToPdf, exportAllReports };
}
