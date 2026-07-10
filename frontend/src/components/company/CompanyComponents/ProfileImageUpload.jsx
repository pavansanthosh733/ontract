import React from "react";
import { BASE_URLS } from "../../../api";

function ProfileImageUpload({ profileImage, setProfileImage, profile, errors, setErrors }) {
  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({ ...prev, profileImage: "JPEG/PNG/GIF only" }));
      return;
    }

    if (file.size > maxSize) {
      setErrors((prev) => ({ ...prev, profileImage: "Max 5MB allowed" }));
      return;
    }

    setErrors((prev) => ({ ...prev, profileImage: null }));
    setProfileImage(file);
  };

  return (
    <div className="col-md-6">
      <label className="form-label">Profile Image <span className="required-asterisk">*</span></label>
      <input type="file" className="form-control" onChange={handleProfileImageChange} accept="image/*" />

      {profile?.logo_path && !profileImage && (
        <div className="mt-2">
          <img
            src={`${BASE_URLS.user}${profile.logo_path}`}
            alt="Current Logo"
            style={{ width: "120px", borderRadius: "10px" }}
          />
          <small className="text-muted d-block">
            (Already uploaded — choose a new file only if you want to replace)
          </small>
        </div>
      )}

      {errors.profileImage && <div className="text-danger">{errors.profileImage}</div>}
    </div>
  );
}

export default ProfileImageUpload;