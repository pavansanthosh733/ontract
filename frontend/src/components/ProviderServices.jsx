function ProviderServices() {
  return (
    <section className="container mt-5 mb-5">
      <h3 className="text-center text-primary mb-4">My Services</h3>
      <div className="row">
        <div className="col-md-4 mb-3">
          <div className="card shadow-sm p-3">
            <h5>Plumbing Service</h5>
            <p>Fixing leaks, pipe installations, and repairs.</p>
            <button className="btn btn-outline-primary btn-sm">Manage</button>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card shadow-sm p-3">
            <h5>Electrical Service</h5>
            <p>Wiring, lighting setup, and repairs.</p>
            <button className="btn btn-outline-primary btn-sm">Manage</button>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card shadow-sm p-3">
            <h5>Cleaning Service</h5>
            <p>House, office, and commercial cleaning.</p>
            <button className="btn btn-outline-primary btn-sm">Manage</button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProviderServices;
