
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { BOQResponse } from "@/util/types";

// --- Constants & Config ---
const COMPANY_NAME = "AutoQS AI Estimates";
const COMPANY_TAGLINE = "Enterprise Quantity Surveying";
const THEME_COLOR = [79, 70, 229]; // Indigo-600
const TEXT_COLOR = [51, 65, 85]; // Slate-700


// --- Helpers ---

const getFilename = (projectType: string) => {
    const date = new Date().toISOString().split('T')[0];
    const safeName = projectType.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `BOQ_${safeName}_${date}`;
};

const fmt = (num: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num);
};

// --- Main Export Function ---

export const exportToPDF = (data: BOQResponse) => {
    const { projectSummary, boqItems, assumptions, recommendedSuppliers } = data;
    const currency = projectSummary.currency || 'USD';

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // ---------------------------------------------------------
    // 1. PRE-CALCULATION PASS (Match App Logic Exactly)
    // ---------------------------------------------------------
    let totalMaterial = 0;
    let totalLabor = 0;
    let totalOandP = 0;

    // We rebuild the data structure for the table to ensure 1:1 match with calculations
    const tableBody: any[] = [];

    boqItems.forEach(trade => {
        let tradeTotal = 0;

        // Header Row for Trade
        tableBody.push([{
            content: trade.tradeName.toUpperCase(),
            colSpan: 8,
            styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [30, 41, 59], halign: 'left' }
        }]);

        trade.items.forEach(item => {
            // Logic must match BOQDisplay.tsx exactly
            const baseRate = item.rateMaterial + item.rateLabor;

            // Use explicit O&P or default to 15%
            let unitOandP = 0;
            if (item.rateAnalysis?.overheadAndProfit && item.rateAnalysis.overheadAndProfit > 0) {
                unitOandP = item.rateAnalysis.overheadAndProfit;
            } else {
                unitOandP = baseRate * 0.15;
            }

            const fullUnitRate = baseRate + unitOandP;
            const lineTotal = item.quantity * fullUnitRate;

            // Accumulate Global Totals
            totalMaterial += (item.rateMaterial * item.quantity);
            totalLabor += (item.rateLabor * item.quantity);
            totalOandP += (unitOandP * item.quantity);
            tradeTotal += lineTotal;

            // Add Row
            let desc = item.description;
            if (item.remarks) desc += `\n[${item.remarks}]`;

            tableBody.push([
                item.itemNo,
                desc,
                `${item.quantity} ${item.unit}`,
                fmt(item.rateMaterial, currency),
                fmt(item.rateLabor, currency),
                fmt(unitOandP, currency),
                fmt(fullUnitRate, currency),
                fmt(lineTotal, currency)
            ]);
        });

        // Trade Subtotal Row
        tableBody.push([{
            content: `Subtotal ${trade.tradeName}:`,
            colSpan: 7,
            styles: { fontStyle: 'bold', halign: 'right' }
        }, {
            content: fmt(tradeTotal, currency),
            styles: { fontStyle: 'bold', halign: 'right', fillColor: [255, 255, 255] }
        }]);
    });

    const grandTotal = totalMaterial + totalLabor + totalOandP;

    // ---------------------------------------------------------
    // 2. HEADER & BRANDING
    // ---------------------------------------------------------

    // Header Background
    doc.setFillColor(THEME_COLOR[0], THEME_COLOR[1], THEME_COLOR[2]);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Title
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("BILL OF QUANTITIES", 14, 20);

    // Subtitle
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Project: ${projectSummary.projectType} | ${projectSummary.structure}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34);

    // Company Info (Right Side)
    doc.setFontSize(12);
    doc.text(COMPANY_NAME, pageWidth - 14, 18, { align: "right" });
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text(COMPANY_TAGLINE, pageWidth - 14, 24, { align: "right" });
    doc.text(`Ref: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`, pageWidth - 14, 30, { align: "right" });


    // ---------------------------------------------------------
    // 3. EXECUTIVE SUMMARY (The "Bottom Line")
    // ---------------------------------------------------------

    // @ts-ignore
    autoTable(doc, {
        startY: 45,
        head: [['Cost Component', 'Amount', '% of Total']],
        body: [
            ['Material Cost', fmt(totalMaterial, currency), `${((totalMaterial / grandTotal) * 100).toFixed(1)}%`],
            ['Labor Cost', fmt(totalLabor, currency), `${((totalLabor / grandTotal) * 100).toFixed(1)}%`],
            ['Overhead & Profit', fmt(totalOandP, currency), `${((totalOandP / grandTotal) * 100).toFixed(1)}%`],
            ['GRAND TOTAL', fmt(grandTotal, currency), '100.0%']
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [255, 255, 255], textColor: [51, 65, 85], fontStyle: 'bold', lineWidth: { bottom: 0.5 }, lineColor: [200, 200, 200] },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 80 },
            1: { halign: 'right' },
            2: { halign: 'right' }
        },
        didParseCell: function (data: any) {
            if (data.row.index === 3) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = THEME_COLOR;
                data.cell.styles.fontSize = 12;
            }
        }
    });

    // ---------------------------------------------------------
    // 4. DETAILED BOQ TABLE
    // ---------------------------------------------------------

    // @ts-ignore
    doc.setFontSize(14);
    doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
    // @ts-ignore
    doc.text("Detailed Cost Breakdown", 14, doc.lastAutoTable.finalY + 15);

    // @ts-ignore
    autoTable(doc, {
        // @ts-ignore
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Ref', 'Description', 'Qty', 'Mat Rate', 'Lab Rate', 'O&P', 'All-in Rate', 'Total']],
        body: tableBody,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 3,
            lineColor: [226, 232, 240],
            textColor: [51, 65, 85]
        },
        headStyles: {
            fillColor: [248, 250, 252],
            textColor: [51, 65, 85],
            fontStyle: 'bold',
            lineWidth: { bottom: 1 },
            lineColor: [203, 213, 225]
        },
        columnStyles: {
            0: { cellWidth: 12 }, // Ref (Slightly wider to handle "1.1.10" etc.)
            1: { cellWidth: 'auto' }, // Desc (Expands to fill the rest of the page)
            2: { cellWidth: 18, halign: 'center' }, // Qty
            3: { cellWidth: 22, halign: 'right' }, // Mat (Increased to 22 for LKR 0.00)
            4: { cellWidth: 22, halign: 'right' }, // Lab (Increased to 22 for LKR 0.00)
            5: { cellWidth: 20, halign: 'right', textColor: [217, 119, 6] }, // O&P
            6: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }, // All-in Rate
            7: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: [79, 70, 229] } // Total (Widest for large sums)
        },
        // Add Summary Rows at the bottom of the table
        foot: [
            [
                { content: 'PROJECT TOTAL:', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } },
                { content: fmt(grandTotal, currency), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10, fillColor: [79, 70, 229], textColor: [255, 255, 255] } }
            ]
        ],
        showFoot: 'lastPage'
    });

    // ---------------------------------------------------------
    // 5. ASSUMPTIONS & NOTES (If space permits, or new page)
    // ---------------------------------------------------------

    if (assumptions.length > 0) {
        // @ts-ignore
        autoTable(doc, {
            // @ts-ignore
            startY: doc.lastAutoTable.finalY + 15,
            head: [['Category', 'Assumption / Note']],
            body: assumptions.map(a => [a.category, a.text]),
            theme: 'striped',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [100, 116, 139] },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
            pageBreak: 'auto'
        });
    }

    // ---------------------------------------------------------
    // 6. SUPPLIERS (Optional)
    // ---------------------------------------------------------

    if (recommendedSuppliers && recommendedSuppliers.length > 0) {
        // @ts-ignore
        doc.text("Recommended Vendors", 14, doc.lastAutoTable.finalY + 15);

        const supplierBody = recommendedSuppliers.map(s => [
            s.trade,
            s.name,
            s.phoneNumber || s.email || '-',
            s.location || '-',
            s.estimatedQuote || '-'
        ]);

        // @ts-ignore
        autoTable(doc, {
            // @ts-ignore
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Trade', 'Company', 'Contact', 'Location', 'Est. Quote']],
            body: supplierBody,
            theme: 'striped',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [100, 116, 139] },
            pageBreak: 'auto'
        });
    }

    // ---------------------------------------------------------
    // 7. FOOTER & PAGE NUMBERS
    // ---------------------------------------------------------

    const pageCount = (doc as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Footer Line
        doc.setDrawColor(200, 200, 200);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

        // Disclaimer
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text("Disclaimer: This estimate is AI-generated for preliminary budgeting purposes only. It does not constitute a binding contract or final offer.", 14, pageHeight - 10);

        // Page Number
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: "right" });
    }

    doc.save(`${getFilename(projectSummary.projectType)}.pdf`);
};
