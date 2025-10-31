import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="w-full text-center p-4 bg-[#fdfbf7]/80 backdrop-blur-sm sticky top-0 z-10">
      <h1 className="text-xl font-light text-[#3a5a40]">
        90-Day Identity Reset
      </h1>
    </header>
  );
};

export default Header;