import React from "react";

export default function LoadingScreen({ message = "Loading..." }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 px-3">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="mt-3 mb-0 text-muted">{message}</p>
    </div>
  );
}
