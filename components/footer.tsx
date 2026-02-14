import React from "react";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-2 mt-auto bg-light text-sm">
      <div className="container">
        <div className="row text-center text-sm-start">
          <div className="col-12 col-md-6 mb-2 mb-md-0">
            &copy; {currentYear} Sanjivan Medico Traders
          </div>
          <div className="col-12 col-md-6 text-center text-sm-end">
            <p className="mb-0" style={{ opacity: 0.8 }}>
              Designed, Developed, and maintained by{" "}
              <a href="https://noobacker.com" target="_blank" rel="noopener noreferrer" style={{ color: "#ff4081", textDecoration: "none" }}>Noobacker</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};