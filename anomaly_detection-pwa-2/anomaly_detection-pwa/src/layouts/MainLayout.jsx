import React, { useState } from "react";
import Header from "../components/_Header";
import Sidebar from "../components/_Sidebar";
import { Outlet } from "react-router-dom"; // Add this for nested routing
import useAuthStatus from '../hooks/useAuthStatus'; // Add this to get role

const MainLayout = () => { // Tanggalin ang { children } prop
  const [sidebar, setSidebar] = useState(false);
  const { role } = useAuthStatus(); // <--- Idagdag ito

  return (
    <div className="flex h-screen">            
      <Sidebar sidebar={sidebar} setSidebar={setSidebar} role={role} />
      <main className="flex-1">   
        <Header sidebar={sidebar} setSidebar={setSidebar}/>
        <div className="p-4"><Outlet /></div> 
      </main>
    </div>
  );
};

export default MainLayout;
