import React from "react";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-3 mt-auto bg-light">
      <div className="container">
        <div className="row text-center text-md-start">
          <div className="col-12 col-md-6 mb-2 mb-md-0">
            &copy; {currentYear} Sanjivan Medico Traders
          </div>
          <div className="col-12 col-md-6 text-center text-md-end">
            <p className="mb-0" style={{ opacity: 0.8 }}>
              Designed, Developed, and maintained by{" "}
              <span style={{ color: "#ff4081" }}>Noobacker</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};