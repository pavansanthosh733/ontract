import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './css/ForgotPassword.css';
import { BASE_URLS } from '../api';

function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const navigate = useNavigate();

  const validateForm = (currentStep) => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (currentStep === 1) {
      if (!email.trim()) {
        errors.email = 'Email is required.';
      } else if (!emailRegex.test(email)) {
        errors.email = 'Please enter a valid email.';
      }
    }

    if (currentStep === 3) {
      if (!newPassword.trim()) {
        errors.newPassword = 'Password is required.';
      } else {
        if (newPassword.length < 8) {
          errors.newPassword = 'Password must be at least 8 characters.';
        } else if (!/[A-Z]/.test(newPassword)) {
          errors.newPassword = 'Password must contain at least one uppercase letter.';
        } else if (!/[a-z]/.test(newPassword)) {
          errors.newPassword = 'Password must contain at least one lowercase letter.';
        }else if (!/[0-9]/.test(newPassword)) {
          errors.newPassword = 'Password must contain at least one digit.';
        }else if (!/[^A-Za-z0-9]/.test(newPassword)) {
          errors.newPassword = 'Password must contain at least one special character.';
        }
      }

      if (!confirmPassword.trim()) {
        errors.confirmPassword = 'Confirm your password.';
      } else if (newPassword !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!validateForm(1)) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${BASE_URLS.user}/api/forgot_send_otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        setStep(2);
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${BASE_URLS.user}/api/verify_reset_otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();
      if (response.ok) {
        setResetToken(data.reset_token);
        setStep(3);
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!validateForm(3)) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${BASE_URLS.user}/api/reset_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reset_token: resetToken, password: newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('Password reset successfully! You can now login with your new password.');
        navigate('/login');
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
    setLoading(false);
  };

  const goBack = () => {
    setStep(step - 1);
    setError('');
  };

  return (
    <div className="forgot-container">
      <div className="forgot-card">
        <h2 className="forgot-title">
          {step === 1 && 'Reset Password'}
          {step === 2 && 'Verify OTP'}
          {step === 3 && 'Set New Password'}
        </h2>
        <p className="forgot-subtitle">
          {step === 1 && 'Enter your email to receive reset instructions'}
          {step === 2 && 'Enter the OTP sent to your email'}
          {step === 3 && 'Enter your new password'}
        </p>
        {error && <div className="alert alert-danger">{error}</div>}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="forgot-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  const value = e.target.value;
                  setEmail(value);
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (emailRegex.test(value)) {
                    setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }
                }}
                required
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>
            {fieldErrors.email && <span className="error-text">{fieldErrors.email}</span>}
            <button type="submit" className="forgot-button" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="forgot-form">
            <div className="form-group">
              <label htmlFor="otp">OTP</label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                disabled={loading}
              />
            </div>
            {error && <span className="error-text">{error}</span>}
            <button type="submit" className="forgot-button" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button type="button" className="btn btn-link" onClick={goBack}>
              Back to Email
            </button>
          </form>
        )}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="forgot-form">
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewPassword(value);
                  if (value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[^A-Za-z0-9]/.test(value)) {
                    setFieldErrors((prev) => ({ ...prev, newPassword: '' }));
                  }
                }}
                required
                placeholder="Enter new password"
                disabled={loading}
              />
            </div>
            {fieldErrors.newPassword && <span className="error-text">{fieldErrors.newPassword}</span>}
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  const value = e.target.value;
                  setConfirmPassword(value);
                  if (value === newPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }
                }}
                required
                placeholder="Confirm new password"
                disabled={loading}
              />
            </div>
            {fieldErrors.confirmPassword && <span className="error-text">{fieldErrors.confirmPassword}</span>}
            <button type="submit" className="forgot-button" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <button type="button" className="btn btn-link" onClick={goBack}>
              Back to OTP
            </button>
          </form>
        )}
        <p className="back-link">
          <Link to="/login" className="link">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;