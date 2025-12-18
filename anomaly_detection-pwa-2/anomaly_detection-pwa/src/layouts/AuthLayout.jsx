// src/layouts/AuthLayout.jsx
import React from "react";
import logo from "../assets/images/logo.jpg";

const AuthLayout = ({ children }) => {
  return (
    <div className="flex w-full h-screen"> 
    
      <div className="w-full flex items-center justify-center lg:w-1/2">
        {children}
      </div>

      <div className="hidden lg:flex h-full w-1/2 items-center justify-center bg-gray-200">
        <div className="w-full h-full bg-cover bg-center"
          style={{ backgroundImage:`url(${logo})` }}>
        </div>
      </div> 

    </div>
  );
};

export default AuthLayout;
