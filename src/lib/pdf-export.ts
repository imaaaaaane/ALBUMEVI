import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { robotoBase64 } from "./roboto-font";

export type ExportPDFParams = {
  title: string;
  subtitle?: string;
  columns: string[];
  data: (string | number)[][];
  summary?: { label: string; value: string | number }[];
  filename: string;
};

export const exportToPDF = (params: ExportPDFParams) => {
  const { title, subtitle, columns, data, summary, filename } = params;
  
  const doc = new jsPDF("p", "pt", "a4");

  // Add Roboto font to support Turkish characters
  const fontBase64 = robotoBase64.replace(/\n/g, ""); // Ensure no newlines
  doc.addFileToVFS("Roboto-Regular.ttf", fontBase64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.setFont("Roboto");

  const today = new Date().toLocaleDateString("tr-TR");

  let cursorY = 40;

  // Header: ALBÜMEVİ
  doc.setFontSize(24);
  doc.setTextColor(19, 19, 22); // #131316
  doc.setFont("Roboto", "normal");
  doc.text("ALBÜMEVİ", 40, cursorY);
  
  doc.setFontSize(10);
  doc.setTextColor(102, 102, 102); // #666
  doc.text("Premium Albüm Üretimi", 40, cursorY + 15);

  // Header: Title & Date (Right aligned)
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(16);
  doc.setTextColor(19, 19, 22);
  doc.text(title, pageWidth - 40, cursorY, { align: "right" });
  
  doc.setFontSize(10);
  doc.setTextColor(102, 102, 102);
  doc.text(`Tarih: ${today}`, pageWidth - 40, cursorY + 15, { align: "right" });

  cursorY += 40;

  // Gold Line Separator
  doc.setDrawColor(166, 124, 82); // #A67C52
  doc.setLineWidth(2);
  doc.line(40, cursorY, pageWidth - 40, cursorY);
  
  cursorY += 25;

  // Subtitle / Firm Name
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(166, 124, 82);
    doc.text("Cari / Belge Sahibi", 40, cursorY);
    
    cursorY += 15;
    doc.setFontSize(14);
    doc.setTextColor(17, 17, 17); // #111
    doc.text(subtitle, 40, cursorY);
    cursorY += 30;
  }

  // Draw Table
  autoTable(doc, {
    startY: cursorY,
    head: [columns],
    body: data,
    theme: 'grid',
    styles: {
      font: "Roboto",
      fontSize: 9,
      textColor: [55, 65, 81],
      lineColor: [229, 231, 235],
      lineWidth: 1
    },
    headStyles: {
      fillColor: [19, 19, 22],
      textColor: [255, 255, 255],
      fontStyle: 'normal'
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    columnStyles: {
      // Right-align the last column (usually amounts)
      [columns.length - 1]: { halign: 'right' }
    }
  });

  // Calculate position after table
  cursorY = (doc as any).lastAutoTable.finalY + 30;

  // Draw Summary / Totals
  if (summary && summary.length > 0) {
    const summaryWidth = 250;
    const summaryX = pageWidth - 40 - summaryWidth;

    summary.forEach((item, index) => {
      const isLast = index === summary.length - 1;
      
      // Draw border top for everything except the first
      if (index > 0 && !isLast) {
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(1);
        doc.line(summaryX, cursorY - 15, pageWidth - 40, cursorY - 15);
      }

      // Label
      doc.setFontSize(10);
      doc.setTextColor(isLast ? 17 : 102, isLast ? 17 : 102, isLast ? 17 : 102);
      doc.text(item.label, summaryX, cursorY);
      
      // Value
      doc.setFontSize(isLast ? 14 : 11);
      doc.setTextColor(isLast ? 166 : 17, isLast ? 124 : 17, isLast ? 82 : 17);
      doc.text(String(item.value), pageWidth - 40, cursorY, { align: "right" });
      
      cursorY += 22;
    });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(1);
  doc.line(40, pageHeight - 40, pageWidth - 40, pageHeight - 40);
  doc.text("Bu belge ALBÜMEVİ otomasyon sistemi tarafından elektronik olarak oluşturulmuştur.", pageWidth / 2, pageHeight - 25, { align: "center" });

  doc.save(filename);
};
