import React, { useState, useRef } from "react";
import { apiGet, apiPost } from "../api";
import "./css/InvoiceCreate.css";
import html2pdf from "html2pdf.js";
import logoSymbol from "/assets/images/ontract_service.png";

const MATERIAL_ROW = "Material Charges - Item Code";
const CREDIT_ROW = "Other Credit & Charges";

const InvoiceCreate = () => {
  const invoiceRef = useRef(null);

  const [rows, setRows] = useState([
    {
      workorder: "",
      desc: "",
      qty: 1,
      unit: 0,
    },
  ]);

  const [header, setHeader] = useState({
    invoiceDate: new Date().toLocaleDateString(),
    invoiceNo: "",
    supplierNumber: "",
    supplierName: "",
    supplierIdentificationNumber: "",
    supplierTIN: "",
    supplierAddress: "",
    clientName: "",
    clientAddr: "",
  });

  const [invoiceGenerated, setInvoiceGenerated] = useState(false);

  /* =========================================
     HANDLE WO
  ========================================= */

  const handleWOChange = (index, value) => {
    if (invoiceGenerated) return;

    const copy = [...rows];
    copy[index].workorder = value;
    setRows(copy);
  };

  /* =========================================
     ADD ROW
  ========================================= */

  const addRow = () => {
    if (invoiceGenerated) return;

    const newRow = {
      workorder: "",
      desc: "",
      qty: 1,
      unit: 0,
    };

    const materialIndex = rows.findIndex(
      (r) => r.workorder === MATERIAL_ROW
    );

    if (materialIndex === -1) {
      setRows([...rows, newRow]);
    } else {
      setRows([
        ...rows.slice(0, materialIndex),
        newRow,
        ...rows.slice(materialIndex),
      ]);
    }
  };

  /* =========================================
     FETCH WO DETAILS
  ========================================= */

  const submitInvoice = async () => {
    try {
      const workOrderRows = [];

      for (let r of rows) {
        if (!r.workorder) continue;

        if (
          r.workorder === MATERIAL_ROW ||
          r.workorder === CREDIT_ROW
        ) {
          continue;
        }

        const wo = await apiGet(
          `/api/workorders/admin/invoice/workorder-details?workorder=${r.workorder}`
        );

        if (!wo) continue;

        if (workOrderRows.length === 0) {
          setHeader((prev) => ({
            ...prev,
            supplierName: wo.name,
            supplierNumber: wo.user_uid,
            supplierIdentificationNumber: wo.id_number,
            supplierTIN: wo.tin_number,
            supplierAddress: wo.billing_address,
            clientName: wo.client,
            clientAddr: wo.billing_address,
          }));
        }

        workOrderRows.push({
          workorder: r.workorder,
          desc: `${wo.description}
${wo.region_name}
${wo.state}
${wo.client}`,
          qty: 1,
          unit: Number(wo.price_rm ?? 0),
        });
      }

      setRows([
        ...workOrderRows,

        {
          workorder: MATERIAL_ROW,
          desc: "Material description",
          qty: 1,
          unit: 0,
        },

        {
          workorder: CREDIT_ROW,
          desc: "Transaction Fee - Credit",
          qty: 1,
          unit: -300,
        },
      ]);
    } catch (err) {
      console.log(err);
      alert("Failed to fetch work orders");
    }
  };

  /* =========================================
     TOTALS
  ========================================= */

  const subtotal = rows.reduce(
    (sum, r) => sum + r.qty * r.unit,
    0
  );

  const taxableSubtotal = rows.reduce((sum, r) => {
    if (
      r.workorder === MATERIAL_ROW ||
      r.workorder === CREDIT_ROW
    ) {
      return sum;
    }

    return sum + r.qty * r.unit;
  }, 0);

  const sst = taxableSubtotal * 0.08;

  const total = subtotal + sst;

  /* =========================================
     GENERATE INVOICE
  ========================================= */

  const generateInvoice = async () => {
    try {
      const res = await apiPost("/api/admin/invoice/generate", {
        header,
        rows,
        subtotal,
        sst,
        total,
      });

      setHeader((prev) => ({
        ...prev,
        invoiceNo: res.invoice_number,
      }));

      setInvoiceGenerated(true);

      alert(`Invoice Generated: ${res.invoice_number}`);
    } catch {
      alert("Invoice generation failed");
    }
  };

  /* =========================================
     DOWNLOAD PDF
  ========================================= */

  const downloadInvoice = () => {
    document.querySelectorAll(".inv-actions").forEach((b) => {
      b.style.display = "none";
    });

    html2pdf()
      .from(invoiceRef.current)
      .set({
        margin: 10,
        filename: `${header.invoiceNo}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
      })
      .save()
      .then(() => {
        document.querySelectorAll(".inv-actions").forEach((b) => {
          b.style.display = "flex";
        });
      });
  };

  return (
    <div className="inv-bg">

      <div className="inv-page" ref={invoiceRef}>

        {/* =========================================
            TOP
        ========================================= */}

        <div className="inv-top">

  <div className="inv-logo-wordmark">

    <img
      src={logoSymbol}
      alt="logo"
      className="inv-logo-o"
    />

    <div className="inv-logo-text">
      ntract.ai
    </div>

  </div>

  <div className="inv-pill">
    Invoice
  </div>

</div>

        {/* =========================================
            BILLING
        ========================================= */}

        <div className="inv-header">

          <div className="inv-header-left">

            <div className="inv-title">
              Billing & Delivery to
            </div>

            <p>{header.clientName}</p>

            <p>{header.clientAddr}</p>

          </div>

          <div className="inv-header-right">

            <p>
              <b>Invoice Date :</b>{" "}
              {header.invoiceDate}
            </p>

            <p>
              <b>Invoice Number :</b>{" "}
              {header.invoiceNo}
            </p>

            <p>
              <b>Supplier Number :</b>{" "}
              {header.supplierNumber}
            </p>

            <p>
              <b>Supplier Name :</b>{" "}
              {header.supplierName}
            </p>

            <p>
              <b>Supplier ID :</b>{" "}
              {header.supplierIdentificationNumber}
            </p>

            <p>
              <b>Supplier TIN :</b>{" "}
              {header.supplierTIN}
            </p>

          </div>

        </div>

        {/* =========================================
            TABLE
        ========================================= */}

        <table className="inv-table">

          <thead>
            <tr>
              <th>WORK ORDER NO</th>
              <th>DESCRIPTION</th>
              <th>QTY</th>
              <th>UNIT PRICE (RM)</th>
              <th>SUBTOTAL (RM)</th>
            </tr>
          </thead>

          <tbody>

  {rows.map((r, i) => {

    const isSpecial =
      r.workorder === MATERIAL_ROW ||
      r.workorder === CREDIT_ROW;

    return (

      <tr key={i}>

        {/* =====================================
            WORK ORDER
        ===================================== */}

        <td>

          {isSpecial ? (

            r.workorder

          ) : (

            r.workorder || (

              <input

                disabled={invoiceGenerated}

                onChange={(e) =>

                  handleWOChange(
                    i,
                    e.target.value
                  )

                }

              />

            )

          )}

        </td>

        {/* =====================================
            DESCRIPTION
        ===================================== */}

        <td
          style={{
            whiteSpace: "pre-line",
          }}
        >

          {r.desc}

        </td>

        {/* =====================================
            QTY
        ===================================== */}

        <td>

          {r.qty}

        </td>

        {/* =====================================
            UNIT PRICE
        ===================================== */}

        <td>
  {isSpecial ? (
    <input
      type="number"
      value={r.unit === 0 ? "" : r.unit}
      onFocus={() => {
        if (r.unit === 0) {
          const copy = [...rows];
          copy[i].unit = "";
          setRows(copy);
        }
      }}
      onChange={(e) => {
        const copy = [...rows];

        copy[i].unit =
          e.target.value === ""
            ? 0
            : Number(e.target.value);

        setRows(copy);
      }}
      style={{
        width: "100%",
        border: "none",
        outline: "none",
        background: "transparent",
        fontSize: "14px",
      }}
    />
  ) : (
    r.unit.toFixed(2)
  )}
</td>

        {/* =====================================
            SUBTOTAL
        ===================================== */}

        <td>

          {(r.qty * r.unit).toFixed(2)}

        </td>

      </tr>
    );
  })}

</tbody>
        </table>

        {/* =========================================
            ACTION BUTTONS
        ========================================= */}

        <div className="inv-actions">

          

          <button onClick={submitInvoice}>
            Submit
          </button>

          <button onClick={generateInvoice}>
            Generate Invoice
          </button>

          <button
            onClick={downloadInvoice}
            disabled={!invoiceGenerated}
          >
            Download PDF
          </button>

        </div>

        {/* =========================================
            TOTALS
        ========================================= */}

        <div className="inv-total-box">

          <div className="inv-total-row">
            <span>Subtotal</span>
            <span>
              RM {subtotal.toFixed(2)}
            </span>
          </div>

          <div className="inv-total-row">
            <span>SST (8%)</span>
            <span>
              RM {sst.toFixed(2)}
            </span>
          </div>

          <div className="inv-grand-total">
            TOTAL : RM {total.toFixed(2)}
          </div>

        </div>

        {/* =========================================
            TERMS
        ========================================= */}

        <div className="inv-terms">

          <p>
            1. Currency in Malaysian Ringgit.
          </p>

          <p>
            2. Invoice due within 14 days
            from invoice date.
          </p>

          <p>
            3. This is a computer generated
            invoice no signature required.
          </p>

        </div>

        {/* =========================================
            SIGNATURE
        ========================================= */}

        <div className="inv-sign">

          <div>
            <div className="inv-sign-line">
              Received by
            </div>
          </div>

          <div>
            <div className="inv-sign-line">
              Sign & Stamp
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default InvoiceCreate;