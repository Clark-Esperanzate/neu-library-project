/* ===================================================
   pdf-report.js – PDF generation using jsPDF (CDN)
   Generates downloadable visitor reports
   =================================================== */

// Load jsPDF dynamically
function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(window.jspdf.jsPDF); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => resolve(window.jspdf.jsPDF);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function loadAutoTable() {
  return new Promise((resolve, reject) => {
    if (window.jspdf && window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.autoTable) {
      resolve(); return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function generatePDFReport() {
  const btn = document.querySelector('.btn-download');
  btn.textContent = '⏳ Generating…';
  btn.disabled = true;

  try {
    const jsPDF = await loadJsPDF();
    await loadAutoTable();

    const range    = document.getElementById('report-range').value;
    const inclSum  = document.getElementById('rpt-summary').checked;
    const inclCol  = document.getElementById('rpt-college').checked;
    const inclPur  = document.getElementById('rpt-purpose').checked;
    const inclLogs = document.getElementById('rpt-logs').checked;

    let visits;
    if (range === 'today')  visits = DB.getTodayVisits();
    else if (range === 'week')  visits = DB.getThisWeekVisits();
    else if (range === 'month') visits = DB.getThisMonthVisits();
    else if (range === 'custom') {
      const from = document.getElementById('report-from').value;
      const to   = document.getElementById('report-to').value;
      if (!from || !to) { alert('Please select a date range for custom report.'); return; }
      visits = DB.getVisitsByRange(from, to);
    } else { visits = DB.getVisits(); }

    const rangeLabels = {
      today: 'Today – ' + new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }),
      week:  'This Week',
      month: 'This Month – ' + new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }),
      custom:'Custom Range',
      all:   'All Time'
    };

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 0;

    // ── Header ──────────────────────────────────────
    // Blue header band
    doc.setFillColor(0, 71, 171);
    doc.rect(0, 0, pageW, 38, 'F');

    // Yellow accent strip
    doc.setFillColor(255, 215, 0);
    doc.rect(0, 38, pageW, 3, 'F');

    doc.setTextColor(255, 215, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('NEW ERA UNIVERSITY LIBRARY', pageW / 2, 14, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Visitor Management System – Report', pageW / 2, 22, { align: 'center' });

    doc.setFontSize(9);
    doc.text(`Period: ${rangeLabels[range] || range}`, pageW / 2, 29, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, pageW / 2, 35, { align: 'center' });

    y = 48;

    // ── Summary Stats ────────────────────────────────
    if (inclSum) {
      doc.setTextColor(0, 47, 115);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary Statistics', 14, y);
      y += 2;
      doc.setDrawColor(0, 71, 171);
      doc.setLineWidth(0.5);
      doc.line(14, y, pageW - 14, y);
      y += 6;

      const todayCount   = DB.getTodayVisits().length;
      const weekCount    = DB.getThisWeekVisits().length;
      const monthCount   = DB.getThisMonthVisits().length;
      const totalCount   = DB.getVisits().length;
      const peakHour     = DB.getPeakHour(visits) || 'N/A';
      const collegeCount = Object.keys(DB.groupByCollege(visits)).length;

      const summaryRows = [
        ['Total Visitors (Period)',    visits.length.toString()],
        ['Today\'s Visitors',         todayCount.toString()],
        ['This Week\'s Visitors',     weekCount.toString()],
        ['This Month\'s Visitors',    monthCount.toString()],
        ['All-Time Total Visitors',   totalCount.toString()],
        ['Colleges Represented',      collegeCount.toString()],
        ['Peak Visit Hour',           peakHour],
      ];

      doc.autoTable({
        startY: y,
        head: [['Metric', 'Value']],
        body: summaryRows,
        theme: 'striped',
        headStyles: { fillColor: [0, 71, 171], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [232, 240, 251] },
        columnStyles: { 1: { fontStyle: 'bold', halign: 'center' } },
        margin: { left: 14, right: 14 },
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // ── By College ───────────────────────────────────
    if (inclCol && y < 260) {
      doc.setTextColor(0, 47, 115);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Visitors by College / Department', 14, y);
      y += 2;
      doc.setDrawColor(0, 71, 171);
      doc.line(14, y, pageW - 14, y);
      y += 6;

      const byCollege = DB.groupByCollege(visits);
      const total = visits.length;
      const collegeRows = Object.entries(byCollege)
        .sort((a, b) => b[1] - a[1])
        .map(([col, count]) => [
          col,
          count.toString(),
          total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0%'
        ]);

      doc.autoTable({
        startY: y,
        head: [['College / Department', 'Visitors', 'Percentage']],
        body: collegeRows,
        theme: 'striped',
        headStyles: { fillColor: [0, 71, 171], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [232, 240, 251] },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
        margin: { left: 14, right: 14 },
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // ── By Purpose ───────────────────────────────────
    if (inclPur) {
      if (y > 240) { doc.addPage(); y = 20; }

      doc.setTextColor(0, 47, 115);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Visitors by Purpose of Visit', 14, y);
      y += 2;
      doc.setDrawColor(0, 71, 171);
      doc.line(14, y, pageW - 14, y);
      y += 6;

      const byPurpose = DB.groupByPurpose(visits);
      const total = visits.length;
      const purposeRows = Object.entries(byPurpose)
        .sort((a, b) => b[1] - a[1])
        .map(([pur, count]) => [
          pur,
          count.toString(),
          total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0%'
        ]);

      doc.autoTable({
        startY: y,
        head: [['Purpose', 'Count', 'Percentage']],
        body: purposeRows,
        theme: 'striped',
        headStyles: { fillColor: [0, 71, 171], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [232, 240, 251] },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
        margin: { left: 14, right: 14 },
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // ── Full Visitor Logs ─────────────────────────────
    if (inclLogs && visits.length > 0) {
      doc.addPage();
      y = 20;

      doc.setTextColor(0, 47, 115);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Full Visitor Log', 14, y);
      y += 2;
      doc.setDrawColor(0, 71, 171);
      doc.line(14, y, pageW - 14, y);
      y += 6;

      const sorted = [...visits].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const logRows = sorted.map((v, i) => {
        const d = new Date(v.timestamp);
        const dateStr = d.toLocaleDateString('en-PH', { year: '2-digit', month: 'short', day: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
        return [
          (i + 1).toString(),
          (v.name || '—').substring(0, 28),
          (v.schoolId || '—'),
          (v.college || '—').replace('College of ', ''),
          (v.purpose || '—'),
          `${dateStr} ${timeStr}`
        ];
      });

      doc.autoTable({
        startY: y,
        head: [['#', 'Name', 'School ID', 'College', 'Purpose', 'Date & Time']],
        body: logRows,
        theme: 'striped',
        headStyles: { fillColor: [0, 71, 171], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        alternateRowStyles: { fillColor: [232, 240, 251] },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 38 },
          2: { cellWidth: 22 },
          3: { cellWidth: 32 },
          4: { cellWidth: 32 },
          5: { cellWidth: 38 }
        },
        margin: { left: 14, right: 14 },
      });
    }

    // ── Footer on all pages ───────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFillColor(0, 71, 171);
      doc.rect(0, doc.internal.pageSize.getHeight() - 12, pageW, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('New Era University Library – Visitor Management System', 14, doc.internal.pageSize.getHeight() - 4.5);
      doc.text(`Page ${p} of ${totalPages}`, pageW - 14, doc.internal.pageSize.getHeight() - 4.5, { align: 'right' });
    }

    // ── Save ──────────────────────────────────────────
    const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    doc.save(`NEULibrary_Report_${rangeLabels[range].replace(/[^a-zA-Z0-9]/g, '_')}_${dateTag}.pdf`);

    // Preview message
    const preview = document.getElementById('report-preview');
    preview.innerHTML = `
      <div style="text-align:center;padding:1.5rem;">
        <div style="font-size:3rem;margin-bottom:0.75rem;">✅</div>
        <p style="font-weight:700;color:var(--green);font-size:1rem;">Report downloaded successfully!</p>
        <p style="color:var(--gray-400);font-size:0.85rem;margin-top:0.35rem;">
          ${visits.length} visitor records included • Period: ${rangeLabels[range] || range}
        </p>
      </div>`;

  } catch (err) {
    console.error('PDF generation error:', err);
    alert('Error generating PDF. Please try again.');
  } finally {
    btn.textContent = '📥  Download PDF Report';
    btn.disabled = false;
  }
}
