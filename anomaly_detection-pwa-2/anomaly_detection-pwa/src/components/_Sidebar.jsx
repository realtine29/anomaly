import React  from "react";
import { FaAngleRight, FaUserGroup } from 'react-icons/fa6';
import { TbLayoutDashboardFilled } from 'react-icons/tb';
import { GiCctvCamera } from 'react-icons/gi';
import { MdNotificationsActive } from 'react-icons/md';
import { IoSettingsSharp } from 'react-icons/io5';
import { NavLink } from "react-router-dom";
import logo from "../assets/icons/192x192.png";

export default function Sidebar({sidebar, setSidebar, role})  {

    const allNavItems = [ // Pinalitan ang pangalan ng variable
        // Nagdagdag ng 'roles' property para malaman kung sino ang may access
        {name: "Dashboard", path: "/", icon:<TbLayoutDashboardFilled className="text-2xl" />, roles: ['user']},
        {name: "Camera", path: "/camera", icon:<GiCctvCamera className="text-2xl" />, roles: ['user']},
        {name: "Alert", path: "/alert", icon:<MdNotificationsActive className="text-2xl" />, roles: ['user']},
        {name: "Setting", path: "/settings", icon:<IoSettingsSharp className="text-2xl" />, roles: ['user']},
        // System Users - Para lang sa Admin
        {name: "System Users", path: "/system-users", icon:<FaUserGroup className="text-2xl" />, roles: ['admin']}, 
    ];

    // Mag-filter batay sa role ng user
    const filteredNavItems = allNavItems.filter(item => item.roles.includes(role));

  return(
        <div className={`fixed bg-white w-64 h-screen shadow-2xl 
            ${sidebar ? "translate-x-0" : "-translate-x-64"} 
            lg:translate-x-0 lg:static z-50 transition-transform duration-300`}> 

            {/* --- HEADER SECTION --- */}
            <div className="p-6 flex flex-col items-center border-b border-gray-100 gap-4">
                <div className="w-full flex justify-between items-center">
                    <img 
                        src={logo} 
                        alt="Logo" 
                        className="h-14 w-14 rounded-full shadow-md border-2 border-violet-100" 
                    />
                    <button className="lg:hidden p-2 bg-gray-100 rounded-full" onClick={() => setSidebar(false)}>
                        <FaAngleRight className="text-gray-600 text-xl" />
                    </button>
                </div>
                <div className="w-full">
                    <h1 className="font-extrabold text-xl leading-tight text-gray-800">
                        Anomaly <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                            Detection System
                        </span>
                    </h1>
                </div>
            </div>

            {/* --- NAVIGATION SECTION --- */}
            <div className="p-4 space-y-2 mt-2">
                {filteredNavItems.map(item => (
                    <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) =>
                        `flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-200 group ${
                        isActive 
                            ? "bg-violet-600 text-white shadow-lg shadow-violet-200" 
                            : "hover:bg-violet-50 text-gray-600 hover:text-violet-600"
                        }`
                    }
                    >
                        <span className={`text-2xl ${ ({isActive}) => isActive ? "text-white" : "text-gray-400 group-hover:text-violet-600"}`}>
                            {item.icon}
                        </span>
                        <span className="text-base font-semibold tracking-wide">{item.name}</span>
                    </NavLink>
                ))}
            </div>
            
        </div>
    )
}