import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';

interface CertificateData {
  studentName: string;
  courseName: string;
  completedAt: string;
}

export async function generateCertificatePdf(data: CertificateData): Promise<void> {
  const { studentName, courseName, completedAt } = data;
  const formattedDate = format(new Date(completedAt), 'MMMM d, yyyy');

  // Create certificate HTML
  const certificateHtml = `
    <div style="
      width: 800px;
      height: 566px;
      padding: 40px;
      background: linear-gradient(135deg, #1a1f2e 0%, #0f1318 100%);
      border: 3px solid rgba(59, 130, 246, 0.3);
      border-radius: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      color: #e2e8f0;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    ">
      <!-- Decorative circles -->
      <div style="
        position: absolute;
        top: -40px;
        left: -40px;
        width: 120px;
        height: 120px;
        background: rgba(59, 130, 246, 0.1);
        border-radius: 50%;
      "></div>
      <div style="
        position: absolute;
        bottom: -60px;
        right: -60px;
        width: 180px;
        height: 180px;
        background: rgba(59, 130, 246, 0.1);
        border-radius: 50%;
      "></div>
      
      <!-- Content -->
      <div style="text-align: center; position: relative; z-index: 1;">
        <!-- Logo -->
        <div style="margin-bottom: 20px;">
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 8px;
          ">
            <div style="
              width: 36px;
              height: 36px;
              background: #3b82f6;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 14px;
            ">SB</div>
            <span style="font-size: 22px; font-weight: bold;">StreamBias</span>
          </div>
        </div>
        
        <!-- Title -->
        <div style="margin-bottom: 24px;">
          <p style="
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 4px;
            color: #94a3b8;
            margin: 0 0 8px 0;
          ">Certificate of Completion</p>
          <div style="
            width: 80px;
            height: 2px;
            background: #3b82f6;
            margin: 0 auto;
          "></div>
        </div>
        
        <!-- Recipient -->
        <div style="margin-bottom: 24px;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0 0 8px 0;">This is to certify that</p>
          <h2 style="font-size: 32px; font-weight: bold; margin: 0; color: #f1f5f9;">${studentName}</h2>
        </div>
        
        <!-- Course -->
        <div style="margin-bottom: 24px;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0 0 8px 0;">has successfully completed the course</p>
          <h3 style="font-size: 20px; font-weight: 600; margin: 0; color: #3b82f6;">${courseName}</h3>
        </div>
        
        <!-- Date -->
        <div style="margin-bottom: 32px;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0 0 4px 0;">Completed on</p>
          <p style="font-size: 14px; font-weight: 500; margin: 0;">${formattedDate}</p>
        </div>
        
        <!-- Signature -->
        <div>
          <div style="
            width: 140px;
            border-top: 1px solid #334155;
            margin: 0 auto 8px;
          "></div>
          <p style="font-size: 10px; color: #94a3b8; margin: 0 0 8px 0;">StreamBias Education</p>
          <div style="
            display: inline-block;
            padding: 4px 12px;
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.3);
            border-radius: 12px;
            font-size: 10px;
            color: #22c55e;
          ">✓ Verified</div>
        </div>
      </div>
    </div>
  `;

  // Create temporary container
  const container = document.createElement('div');
  container.innerHTML = certificateHtml;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  const element = container.firstElementChild as HTMLElement;

  const options = {
    margin: 0,
    filename: `StreamBias-Certificate-${courseName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      backgroundColor: '#0f1318'
    },
    jsPDF: { 
      unit: 'px', 
      format: [800, 566], 
      orientation: 'landscape' as const
    }
  };

  try {
    await html2pdf().set(options).from(element).save();
  } finally {
    document.body.removeChild(container);
  }
}
