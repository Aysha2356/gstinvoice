// Computes per-item amount and invoice-level GST totals.
// Each item: { qty, rate, sgstPct, cgstPct, cessPct }
function calcInvoiceTotals(items) {
  let subtotal = 0;
  let sgstTotal = 0;
  let cgstTotal = 0;
  let cessTotal = 0;

  const computedItems = items.map((item) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const sgstPct = Number(item.sgstPct) || 0;
    const cgstPct = Number(item.cgstPct) || 0;
    const cessPct = Number(item.cessPct) || 0;

    const amount = qty * rate;
    const sgst = (amount * sgstPct) / 100;
    const cgst = (amount * cgstPct) / 100;
    const cess = (amount * cessPct) / 100;

    subtotal += amount;
    sgstTotal += sgst;
    cgstTotal += cgst;
    cessTotal += cess;

    return { ...item, qty, rate, sgstPct, cgstPct, cessPct, amount };
  });

  const total = subtotal + sgstTotal + cgstTotal + cessTotal;

  return {
    items: computedItems,
    subtotal: round2(subtotal),
    sgstTotal: round2(sgstTotal),
    cgstTotal: round2(cgstTotal),
    cessTotal: round2(cessTotal),
    total: round2(total),
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { calcInvoiceTotals };
