import { useCallback } from 'react';

interface ExportOptions {
  filename: string;
  title: string;
  dateRange: string;
}

export function usePdfExport() {
  const exportToPdf = useCallback(async (elementId: string, options: ExportOptions) => {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with id "${elementId}" not found`);
      return;
    }

    // Dynamically import html2pdf to avoid SSR issues
    const html2pdf = (await import('html2pdf.js')).default;

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${options.filename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        backgroundColor: '#0a0a0a',
        logging: false,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    // Create a wrapper with header info
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'background: #0a0a0a; color: #fafafa; padding: 20px; font-family: system-ui, sans-serif;';
    
    // Add header
    const header = document.createElement('div');
    header.style.cssText = 'margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #27272a;';
    header.innerHTML = `
      <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 8px 0;">${options.title}</h1>
      <p style="font-size: 12px; color: #a1a1aa; margin: 0;">Date Range: ${options.dateRange}</p>
      <p style="font-size: 10px; color: #71717a; margin: 4px 0 0 0;">Generated: ${new Date().toLocaleString()}</p>
    `;
    wrapper.appendChild(header);
    
    // Clone the content
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.cssText = 'background: #0a0a0a;';
    
    // Remove any export buttons from the clone
    clone.querySelectorAll('[data-pdf-exclude]').forEach(el => el.remove());
    
    wrapper.appendChild(clone);
    
    // Temporarily add to DOM (hidden)
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = '800px';
    document.body.appendChild(wrapper);

    try {
      await html2pdf().set(opt).from(wrapper).save();
    } finally {
      document.body.removeChild(wrapper);
    }
  }, []);

  const exportAllReports = useCallback(async (elements: { id: string; title: string }[], options: { filename: string; dateRange: string }) => {
    const html2pdf = (await import('html2pdf.js')).default;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'background: #0a0a0a; color: #fafafa; padding: 20px; font-family: system-ui, sans-serif;';
    
    // Main header
    const mainHeader = document.createElement('div');
    mainHeader.style.cssText = 'margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #27272a;';
    mainHeader.innerHTML = `
      <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0;">StreamBias Trading Report</h1>
      <p style="font-size: 14px; color: #a1a1aa; margin: 0;">Complete Analytics Summary</p>
      <p style="font-size: 12px; color: #a1a1aa; margin: 4px 0 0 0;">Date Range: ${options.dateRange}</p>
      <p style="font-size: 10px; color: #71717a; margin: 4px 0 0 0;">Generated: ${new Date().toLocaleString()}</p>
    `;
    wrapper.appendChild(mainHeader);

    // Add each section
    for (const { id, title } of elements) {
      const element = document.getElementById(id);
      if (element) {
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom: 40px; page-break-inside: avoid;';
        
        const sectionHeader = document.createElement('h2');
        sectionHeader.style.cssText = 'font-size: 18px; font-weight: 600; margin: 0 0 15px 0; color: #fafafa; border-bottom: 1px solid #27272a; padding-bottom: 8px;';
        sectionHeader.textContent = title;
        section.appendChild(sectionHeader);
        
        const clone = element.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('[data-pdf-exclude]').forEach(el => el.remove());
        section.appendChild(clone);
        
        wrapper.appendChild(section);
      }
    }

    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = '800px';
    document.body.appendChild(wrapper);

    const opt = {
      margin: [15, 10, 15, 10],
      filename: `${options.filename}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        backgroundColor: '#0a0a0a',
        logging: false,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    try {
      await html2pdf().set(opt).from(wrapper).save();
    } finally {
      document.body.removeChild(wrapper);
    }
  }, []);

  return { exportToPdf, exportAllReports };
}
