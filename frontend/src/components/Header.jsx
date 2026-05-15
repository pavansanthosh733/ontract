import { Link } from 'react-router-dom';

function Header({ user, setUser }) {
  return (
    <header style={{ backgroundColor: '#3b82f6', color: 'white', padding: '1rem' }}>
      <div style={{ margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Auth App</h1>
        <nav>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '1rem' }}>Welcome, {user.email}</span>
              <button
                onClick={() => setUser(null)}
                style={{ backgroundColor: '#ef4444', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.25rem', cursor: 'pointer' }}
                onMouseOver={(e) => (e.target.style.backgroundColor = '#dc2626')}
                onMouseOut={(e) => (e.target.style.backgroundColor = '#ef4444')}
              >
                Logout
              </button>
            </div>
          ) : (
            <div>
              <Link to="/login" style={{ marginRight: '1rem', textDecoration: 'underline', color: 'white' }}>Login</Link>
              <Link to="/signup" style={{ textDecoration: 'underline', color: 'white' }}>Signup</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;