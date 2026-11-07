import React from 'react';
import { Link } from 'react-router-dom';

// The ReliefPay logo (it already contains the name), linking to the home page.
export const BrandLogo = ({ className = 'h-12' }) => (
  <Link to="/" aria-label="ReliefPay home" className="inline-flex shrink-0">
    <img src="/imgs/logo.png" alt="ReliefPay" className={`${className} w-auto rounded-lg bg-white`} />
  </Link>
);
