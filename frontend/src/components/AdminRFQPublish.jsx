import React from "react";

function AdminRFQPublish() {
  return (
    <div className="container py-5">
      <div className="card shadow-sm border-0">
        <div className="card-body text-center py-5">

          <div style={{ fontSize: "70px" }}>🚧</div>

          <h2 className="fw-bold text-primary mt-3">
            RFQ Publish Module
          </h2>

          <p className="text-muted mt-3 fs-5">
            This module is currently <strong>under development</strong>.
          </p>

          <p className="text-secondary mx-auto" style={{ maxWidth: "700px" }}>
            We are working on implementing the RFQ Publish functionality to
            enable administrators to publish RFQs to eligible contractors,
            manage publication status, and monitor the publishing process.
            This feature will be available in an upcoming release.
          </p>

          <div className="alert alert-info mt-4 d-inline-block">
            <strong>Coming Soon!</strong> 🚀
            <br />
            Thank you for your patience while we complete this module.
          </div>

        </div>
      </div>
    </div>
  );
}

export default AdminRFQPublish;