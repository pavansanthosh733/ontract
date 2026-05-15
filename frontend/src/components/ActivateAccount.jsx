import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import "./css/activateAccount.css";
import { BASE_URLS } from '../api';

function ActivateAccount({ setUser }) {
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid activation link');
    }
  }, [token]);

  const handleActivate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BASE_URLS.user}/api/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await response.json();
      if (response.ok) {
        setActivated(true);
        // setUser({ email: data.email }); // Adjust if email isn't returned
        // navigate('/provider_home');

         // ✅ Save the user in localStorage for persistence--Ramya 17-10-2025
        if (data.email) {
          localStorage.setItem('user', JSON.stringify({ email: data.email }));
          setUser({ email: data.email });
        }

        // ✅ Redirect to provider home after a short delay
        setTimeout(() => {
          navigate('/provider_home/profile', { state: { email: data.email } });
        }, 1500);
        //---Ramya 17-10-2025
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  if (error) return <div className="activate-container" style={{ color: '#ef4444', padding: '1rem' }}>{error}</div>;

  return (
    <div className="activate-container">
      <h2 className="activate-title">Activate Account</h2>
      {!activated ? (
        <form onSubmit={handleActivate} className="activate-form">
          <p className="activate-text">Do you want to activate your account?</p>
          <div className="activate-buttons">
            <button type="submit" className="activate-yes">Yes</button>
            <button type="button" onClick={() => navigate('/')} className="activate-no">No</button>
          </div>
        </form>
      ) : (
        <p className="activate-success">Account activated! Redirecting...</p>
      )}
    </div>
  );
}

export default ActivateAccount;