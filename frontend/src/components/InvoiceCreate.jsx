import React, { useState, useRef } from "react";
import { apiGet, apiPost } from "../api";
import "./css/InvoiceCreate.css";
import html2pdf from "html2pdf.js";
import logoSymbol from "/assets/images/ontract_service.png";

const MATERIAL_ROW = "Material Charges - Item Code";
const CREDIT_ROW = "Other Credit & Charges";

const InvoiceCreate = () => {
  const invoiceRef = useRef(null);

  /* ============================
     STATE
  ============================ */
  const [rows, setRows] = useState([
    { workorder: "", desc: "", qty: 1, unit: 0 }
  ]);

  const [header, setHeader] = useState({
    invoiceDate: new Date().toLocaleDateString(),
    invoiceNo: "",
    supplierNumber: "",
    supplierName: "",
    supplierIdentificationNumber: "",
    supplierTIN: "",
    clientName: "",
    clientAddr: ""
  });

  const [invoiceGenerated, setInvoiceGenerated] = useState(false);

  /* ============================
     HANDLE WORK ORDER CHANGE
  ============================ */
  const handleWOChange = (index, value) => {
    if (invoiceGenerated) return;
    const copy = [...rows];
    copy[index].workorder = value;
    setRows(copy);
  };

  /* ============================
     ADD ROW (INSERT ABOVE MATERIAL)
  ============================ */
  const addRow = () => {
    if (invoiceGenerated) return;

    const newRow = { workorder: "", desc: "", qty: 1, unit: 0 };

    const materialIndex = rows.findIndex(
      r => r.workorder === MATERIAL_ROW
    );

    if (materialIndex === -1) {
      setRows([...rows, newRow]);
    } else {
      setRows([
        ...rows.slice(0, materialIndex),
        newRow,
        ...rows.slice(materialIndex)
      ]);
    }
  };

  /* ============================
     SUBMIT (FETCH WO DATA)
  ============================ */
  const submitInvoice = async () => {
    if (invoiceGenerated) return;

    try {
      const workOrderRows = [];

      for (let r of rows) {
        if (!r.workorder) continue;
        if (r.workorder === MATERIAL_ROW || r.workorder === CREDIT_ROW) continue;

        const wo = await apiGet(
          `/api/workorders/admin/invoice/workorder-details?workorder=${r.workorder}`
        );

        if (!wo) continue;

        if (workOrderRows.length === 0) {
          setHeader(prev => ({
            ...prev,
            supplierName: wo.name,
            supplierNumber: wo.user_uid,
            supplierIdentificationNumber: wo.id_number,
            supplierTIN: wo.tin_number,
            clientName: wo.client,
            clientAddr: wo.billing_address
          }));
        }

        workOrderRows.push({
          workorder: r.workorder,
          desc: `${wo.description}\n${wo.category}\n${wo.region_name}\n${wo.state}\n${wo.client}`,
          qty: 1,
          unit: Number(wo.price_rm ?? wo.price ?? 0)
        });
      }

      setRows([
        ...workOrderRows,
        {
          workorder: MATERIAL_ROW,
          desc: "Material description",
          qty: 1,
          unit: 0
        },
        {
          workorder: CREDIT_ROW,
          desc: "Transaction Fee - Credit",
          qty: 1,
          unit: 0
        }
      ]);
    } catch {
      alert("Submit failed");
    }
  };

  /* ============================
     TOTALS (CORRECT SST LOGIC)
  ============================ */

  // Subtotal (ALL rows)
  const subtotal = rows.reduce(
    (sum, r) => sum + r.qty * r.unit,
    0
  );

  // Taxable subtotal (ONLY work orders)
  const taxableSubtotal = rows.reduce((sum, r) => {
    if (
      r.workorder === MATERIAL_ROW ||
      r.workorder === CREDIT_ROW
    ) {
      return sum;
    }
    return sum + r.qty * r.unit;
  }, 0);

  // SST only on taxable items
  const sst = taxableSubtotal * 0.08;

  // Final total
  const total = subtotal - sst;

  /* ============================
     GENERATE INVOICE
  ============================ */
  const generateInvoice = async () => {
    try {
      const res = await apiPost("/api/admin/invoice/generate", {
        header,
        rows,
        subtotal,
        sst,
        total
      });

      setHeader(prev => ({ ...prev, invoiceNo: res.invoice_number }));
      setInvoiceGenerated(true);
      alert(`Invoice Generated: ${res.invoice_number}`);
    } catch {
      alert("Invoice generation failed");
    }
  };

  /* ============================
     DOWNLOAD PDF
  ============================ */
  const downloadInvoice = () => {
    if (!invoiceGenerated) {
      alert("Generate invoice first");
      return;
    }

    document.querySelectorAll(".action-buttons").forEach(b => {
      b.style.display = "none";
    });

    html2pdf()
      .from(invoiceRef.current)
      .set({
        margin: 10,
        filename: `${header.invoiceNo}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      })
      .save()
      .then(() => {
        document.querySelectorAll(".action-buttons").forEach(b => {
          b.style.display = "block";
        });
      });
  };

  /* ============================
     RENDER
  ============================ */
  return (
    <div className="pdf-bg">
      <div className="pdf-page" ref={invoiceRef}>

        {/* HEADER */}
        <div className="pdf-top">
          <div className="logo-wordmark">
            <img src={logoSymbol} alt="O" className="logo-o" />
            <span className="logo-text">ntract.ai</span>
          </div>
          <div className="invoice-pill">Invoice</div>
        </div>

        {/* BILLING */}
        <div className="pdf-header">
          <div>
            <b>Billing & Delivery to:</b>
            <p>{header.clientName}</p>
            <p>{header.clientAddr}</p>
          </div>
          <div>
            <p>Invoice Date: {header.invoiceDate}</p>
            <p>Invoice Number: {header.invoiceNo}</p>
            <p>Supplier Number: {header.supplierNumber}</p>
            <p>Supplier Name: {header.supplierName}</p>
            <p>Supplier ID: {header.supplierIdentificationNumber}</p>
            <p>Supplier TIN: {header.supplierTIN}</p>
          </div>
        </div>

        {/* TABLE */}
        <table className="pdf-table">
          <thead>
            <tr>
              <th>Work Order No</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price (RM)</th>
              <th>Subtotal (RM)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isSpecial =
                r.workorder === MATERIAL_ROW ||
                r.workorder === CREDIT_ROW;

              return (
                <tr key={i}>
                  <td>
                    {isSpecial
                      ? r.workorder
                      : r.workorder || (
                          <input
                            disabled={invoiceGenerated}
                            onChange={e =>
                              handleWOChange(i, e.target.value)
                            }
                          />
                        )}
                  </td>
                  <td style={{ whiteSpace: "pre-line" }}>{r.desc}</td>
                  <td>{r.qty}</td>
                  <td>{r.unit.toFixed(2)}</td>
                  <td>{(r.qty * r.unit).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ACTIONS */}
        <div className="action-buttons">
          <button onClick={addRow}>+ Add Work Order</button>
          <button onClick={submitInvoice}>Submit</button>
          <button onClick={generateInvoice}>Generate Invoice</button>
        </div>

        {/* TOTALS */}
        <div className="total-box">
          <p>Subtotal: RM {subtotal.toFixed(2)}</p>
          <p>SST (8%): RM {sst.toFixed(2)}</p>
          <h3>TOTAL: RM {total.toFixed(2)}</h3>
        </div>

        <div className="terms">
          <p>1. Currency in Malaysian Ringgit.</p>
          <p>2. Invoice due within 14 days.</p>
        </div>

        <div className="sign">
          <div>Received by:</div>
          <div>Sign & Stamp</div>
        </div>

        <div className="action-buttons center">
          <button onClick={downloadInvoice} disabled={!invoiceGenerated}>
            Download PDF
          </button>
        </div>

      </div>
    </div>
  );
};

export default InvoiceCreate;