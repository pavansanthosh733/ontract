import React from "react";
import { BASE_URLS } from "../../../api";

function CertificateUpload({
  certificates,
  setCertificates,
  profile,
  errors,
  setErrors,
}) {
  const handleCertificateChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (!newFiles.length) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
    ];

    const maxSize = 10 * 1024 * 1024;
    const validFiles = [];

    for (const file of newFiles) {
      if (!allowedTypes.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          certificate: "JPEG/PNG/GIF/PDF only",
        }));
        return;
      }

      if (file.size > maxSize) {
        setErrors((prev) => ({
          ...prev,
          certificate: "Each file must be max 10MB",
        }));
        return;
      }

      validFiles.push(file);
    }

    setErrors((prev) => ({
      ...prev,
      certificate: null,
    }));

    setCertificates((prev) => [...prev, ...validFiles]);

    // allow selecting same file again
    e.target.value = "";
  };

  return (
    <div className="col-md-6">
      <label className="form-label">
        Certificate <span className="required-asterisk">*</span>
      </label>

      <input
        type="file"
        className="form-control"
        onChange={handleCertificateChange}
        accept="image/*,application/pdf"
        multiple
      />

      {/* Newly Selected Files */}
      {certificates.length > 0 && (
        <div className="row mt-3">
          {certificates.map((file, idx) => (
            <div className="col-md-3 mb-3" key={idx}>
              <div className="border rounded p-2 text-center position-relative">

                <button
                  type="button"
                  className="btn btn-danger btn-sm position-absolute top-0 end-0"
                  onClick={() =>
                    setCertificates((prev) =>
                      prev.filter((_, i) => i !== idx)
                    )
                  }
                >
                  ×
                </button>

                {file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Certificate"
                    className="img-fluid rounded"
                    style={{
                      height: "120px",
                      width: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    className="d-flex flex-column justify-content-center align-items-center"
                    style={{ height: "120px" }}
                  >
                    <i
                      className="bi bi-file-earmark-pdf"
                      style={{
                        fontSize: "40px",
                        color: "red",
                      }}
                    />

                    <small className="mt-2 text-break">
                      {file.name}
                    </small>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Existing Uploaded Certificates */}
      {Array.isArray(profile?.certificate_path) &&
        profile.certificate_path.length > 0 &&
        certificates.length === 0 && (
          <div className="mt-3">

            <strong className="d-block mb-2">
              Uploaded Certificates
            </strong>

            <div className="row">
              {profile.certificate_path.map((path, idx) => {
                const isImage =
                  /\.(jpg|jpeg|png|gif|webp)$/i.test(path);

                const isPdf =
                  /\.pdf$/i.test(path);

                return (
                  <div
                    className="col-md-3 mb-3"
                    key={idx}
                  >
                    <div className="border rounded p-2 text-center">

                      {isImage ? (
                        <img
                          src={`${BASE_URLS.user}${path}`}
                          alt={`Certificate ${idx + 1}`}
                          className="img-fluid rounded"
                          style={{
                            height: "120px",
                            width: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : isPdf ? (
                        <a
                          href={`${BASE_URLS.user}${path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline-primary btn-sm"
                        >
                          View PDF
                        </a>
                      ) : (
                        <a
                          href={`${BASE_URLS.user}${path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline-secondary btn-sm"
                        >
                          Open File
                        </a>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {errors?.certificate && (
        <div className="text-danger">
          {errors.certificate}
        </div>
      )}
    </div>
  );
}

export default CertificateUpload;