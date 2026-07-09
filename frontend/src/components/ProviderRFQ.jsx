import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import "./css/ProviderRFQ.css";
import { useUser } from "../context/UserContext";
function ProviderRFQ() {

    const { user } = useUser();
    const [activeTab, setActiveTab] = useState("NEW");
    const [rfqs, setRfqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRFQ, setSelectedRFQ] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [quotedItems, setQuotedItems] = useState([]);
    const [contractorRemarks, setContractorRemarks] = useState("");

    useEffect(() => {
        setLoading(true);
        if (activeTab === "NEW") {
            fetchNewRfqs();
        }
        else if (activeTab === "RESPONDED") {
            fetchRespondedRfqs();
        }
    }, [activeTab]);

    const submitQuotation = async () => {

        try {
            const hasEmptyPrice = quotedItems.some(
                item =>
                    item.unit_price === "" ||
                    Number(item.unit_price) <= 0
            );

            if (hasEmptyPrice) {
                alert("Please enter unit price for all items.");
                return;
            }

            if (!contractorRemarks.trim()) {
                alert("Please enter contractor remarks.");
                return;
            }
            const payload = {
                rfq_id: selectedRFQ.header.rfq_id,
                contractor_id: user.user_uid,
                remarks: contractorRemarks,
                grand_total: quotedItems.reduce((sum, item) => sum + Number(item.total),0),
                items: quotedItems.map(item => ({
                    rfq_item_id: item.rfq_item_id,
                    quantity: item.quantity,
                    unit_price: Number(item.unit_price),
                    total: Number(item.total)
                }))
            };

            console.log(payload);
            await apiPost("/api/workorders/provider/rfq/respond",payload);
            alert("Quotation submitted successfully.");
            setShowModal(false);
            setSelectedRFQ(null);
            setQuotedItems([]);
            setContractorRemarks("");
            setActiveTab("RESPONDED");
        } catch (err) {

            console.error(err);

        }

    };

    const fetchNewRfqs = async () => {
        try {
            const data = await apiGet(`/api/workorders/provider/rfq/new/${user.user_uid}`);
            setRfqs(Array.isArray(data) ? data : []);
        } catch (err) {

            console.error(err);

        } finally {

            setLoading(false);

        }
    };

    const fetchRespondedRfqs = async () => {
        try {
            const data = await apiGet(`/api/workorders/provider/rfq/responded/${user.user_uid}`);
            setRfqs(
                Array.isArray(data)
                    ? data
                    : []
            );

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }

    };

    const handleView = async (rfqNo) => {
        try {
            const data = await apiGet(`/api/workorders/provider/rfq/${rfqNo}`);
            setSelectedRFQ(data);
            setQuotedItems(data.items.map(item => ({...item,unit_price: "",total: 0})));
            setContractorRemarks("");
            setShowModal(true);
        } catch (err) {
            console.error(err);
            alert("Unable to fetch RFQ details.");
        }

    };
    const handleUnitPriceChange = (index, value) => {
        const updated = [...quotedItems];
        updated[index].unit_price = value;
        updated[index].total =
            Number(updated[index].quantity) *
            Number(value || 0);
        setQuotedItems(updated);
    };

    return (
        <>
        <div className="provider-rfq-container">

            <div className="provider-rfq-header">

                <h2>Request For Quotations</h2>

            </div>

            <div className="rfq-tabs">

                <button
                    className={activeTab === "NEW" ? "active" : ""}
                    onClick={() => setActiveTab("NEW")}
                >
                    New
                </button>

                <button
                    className={activeTab === "RESPONDED" ? "active" : ""}
                    onClick={() => setActiveTab("RESPONDED")}
                >
                    Responded
                </button>

                <button
                    className={activeTab === "IGNORED" ? "active" : ""}
                    onClick={() => setActiveTab("IGNORED")}
                >
                    Ignored
                </button>

            </div>

            <div className="rfq-table-card">

                {loading ? (

                    <div className="loading">
                        Loading RFQs...
                    </div>

                ) : (

                    <table className="rfq-table">

                        <thead>

                            <tr>

                                <th>RFQ No</th>

                                <th>Title</th>

                                <th>Closing Date</th>

                                <th>Status</th>

                                <th>Action</th>

                            </tr>

                        </thead>

                        <tbody>

                            {rfqs.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan="5"
                                        style={{
                                            textAlign: "center",
                                            padding: "25px"
                                        }}
                                    >

                                        No RFQs Found

                                    </td>

                                </tr>

                            ) : (

                                rfqs.map((rfq) => (

                                    <tr key={rfq.rfq_id}>

                                        <td>{rfq.rfq_no}</td>

                                        <td>{rfq.rfq_title}</td>

                                        <td>{rfq.closing_date}</td>

                                        <td>
                                            <span className="status-open">
                                                {rfq.status}
                                            </span>
                                        </td>
                                        <td>
                                        {activeTab === "NEW" ? (
                                            <button
                                                className="view-btn"
                                                onClick={() => handleView(rfq.rfq_no)}
                                            >
                                                View
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-success btn-sm"
                                                disabled
                                            >
                                                Submitted
                                            </button>
                                        )}
                                    </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div> 
        {
    showModal &&
    selectedRFQ && (

        <div className="rfq-modal-overlay">
            <div className="rfq-modal">
                <div className="rfq-modal-header">
                    <h3>Quotation Submission
                    <br/>
                    <small>{selectedRFQ.header.rfq_no}</small>
                    </h3>
                    <button
                        className="close-btn"
                        onClick={() => setShowModal(false)}
                    >
                        ✕

                    </button>
                </div>
                <div className="rfq-modal-body">
                    <table className="table table-bordered">
                        <tbody>
                            <tr>
                                <th>Title</th>
                                <td>{selectedRFQ.header.rfq_title}</td>
                            </tr>
                            <tr>
                                <th>Category</th>
                                <td>{selectedRFQ.header.category_name}</td>
                            </tr>
                            <tr>
                                <th>Region</th>
                                <td>{selectedRFQ.header.region_name}</td>
                            </tr>
                            <tr>
                                <th>State</th>
                                <td>{selectedRFQ.header.state_name}</td>
                            </tr>
                            <tr>
                                <th>City</th>
                                <td>{selectedRFQ.header.city_name}</td>
                            </tr>
                            <tr>
                                <th>Closing Date</th>
                                <td>{selectedRFQ.header.closing_date}</td>
                            </tr>
                        </tbody>
                    </table>
                    <br />
                    <h5>Description</h5>
                    <p> {selectedRFQ.header.description} </p>
                    <h5>Remarks</h5>
                    <p> {selectedRFQ.header.remarks} </p>

                    <hr />
                    <h5>Attachments</h5>
                    {selectedRFQ.attachments?.length > 0 ? (
                        <ul>
                            {selectedRFQ.attachments.map((file,index)=>(
                                <li key={index}>
                                    <a href={file} target="_blank" rel="noreferrer">
                                        Attachment {index+1}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No Attachments</p>
                    )}
                    <h5 className="mb-3">Quotation Items</h5>
                    <div className="container-fluid p-0">
                        <div className="row fw-bold border-bottom pb-2 mb-2">
                            <div className="col-7">Item Description</div>
                            <div className="col-1 text-center">Qty</div>
                            <div className="col-2 text-center">Unit Price (RM)</div>
                            <div className="col-2 text-end">Total (RM)</div>
                        </div>
                        {quotedItems.map((item, index) => (
                            <div
                                className="row align-items-center border-bottom py-2"
                                key={item.rfq_item_id}
                            >
                                <div className="col-7">{item.item_description}</div>
                                <div className="col-1 text-center">{item.quantity}</div>
                                <div className="col-2">

                                    <div className="input-group input-group-sm">
                                        <span className="input-group-text">RM</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="form-control"
                                            value={item.unit_price}
                                            onChange={(e) =>
                                                handleUnitPriceChange(
                                                    index,
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="col-2 text-end fw-bold text-success">
                                    RM {Number(item.total).toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="alert alert-success mt-3 text-end">
                        <h4 className="mb-0">
                            Grand Total :
                            RM {
                                quotedItems
                                    .reduce((sum, item) => sum + Number(item.total),0)
                                    .toFixed(2)
                            }
                        </h4>
                    </div>
                    <div className="mt-4">
                        <label className="form-label fw-bold">Contractor Remarks</label>
                        <textarea className="form-control" rows="4"
                            placeholder="Enter your quotation remarks..."
                            value={contractorRemarks}
                            onChange={(e) =>
                                setContractorRemarks(
                                    e.target.value
                                )
                            }
                        />
                    </div>
                </div>

                <div className="rfq-modal-footer">
                    <button className="btn btn-secondary"
                            onClick={() => setShowModal(false)}
                    >Close
                    </button>
                    <button className="btn btn-outline-danger">Ignore RFQ</button>
                    <button
                        className="btn btn-success"
                        onClick={submitQuotation}
                    >Submit Quotation
                    </button>
                </div>

            </div>

        </div>

    )
} 
        
</>
    );
    

}

export default ProviderRFQ;