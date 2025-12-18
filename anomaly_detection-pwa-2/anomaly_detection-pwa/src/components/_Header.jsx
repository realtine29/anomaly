import { FaBars } from "react-icons/fa";
import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import userImg from "../assets/images/userImg.png";
import { useLocation } from "react-router-dom";
import ProfileSidebar from "./_ProfileSidebar"; // gagawin natin ito

export default function Header({ sidebar, setSidebar }) {
  const auth = getAuth();
  const user = auth.currentUser;
  const photoURL = user?.photoURL || userImg;

  const location = useLocation();

  const pageTitles = {
    "/": "Dashboard",
    "/camera": "Camera",
    "/anomalies": "Anomalies",
    "/alert": "Alert",
    "/settings": "Settings",
  };

  const currentTitle = pageTitles[location.pathname];

  // state para sa profile sidebar
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <header className="bg-white flex justify-between items-center p-4">
        <button className="lg:hidden" onClick={() => setSidebar(true)}>
          <FaBars className="text-black-400 text-2xl" />
        </button>

        <h1 className="text-2xl font-bold">{currentTitle}</h1>

        <img
          src={photoURL}
          alt="User"
          className="w-10 h-10 rounded-full object-cover cursor-pointer"
          onClick={() => setProfileOpen(true)}
        />
      </header>
      <ProfileSidebar open={profileOpen} setOpen={setProfileOpen} user={user} />
    </>
  );
}
