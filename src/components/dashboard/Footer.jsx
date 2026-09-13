
import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full bg-gray-100 dark:bg-gray-800 p-4 text-center text-gray-600 dark:text-gray-400 text-sm border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto">
        <p>
          &copy; {new Date().getFullYear()} SonTag POS/ERP software | Developed by SonTag Technologies.
        </p>
        <p>
          Phone: +234-901-904-2426
        </p>
      </div>
    </footer>
  );
};

export default Footer;
