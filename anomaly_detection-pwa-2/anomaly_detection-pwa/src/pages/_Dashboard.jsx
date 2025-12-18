// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { FaVideo, FaExclamationTriangle } from "react-icons/fa";


export default function Dashboard() {
  const [time, setTime] = useState(new Date());
  const [alerts, setAlerts] = useState([]);
  

  // 1. Auto-update time every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Poll for Alerts from Backend every 2 seconds
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        // Fetch logs from the Flask server
        const response = await fetch("http://localhost:5000/logs");
        const data = await response.json();
       
        // Reverse array to show newest alerts at the top
        setAlerts(data.reverse());
      } catch (error) {
        console.error("Error fetching alerts:", error);
      }
    };

    fetchAlerts(); // Initial fetch
    const alertInterval = setInterval(fetchAlerts, 2000); // Poll every 2s

    return () => clearInterval(alertInterval);
  }, []);

  // Format date & time
  const formattedDate = time.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Helper to color-code alerts
  const getAlertStyle = (type) => {
    if (type.includes("Fighting") || type.includes("Pose")) return "bg-red-50 border-red-500 text-red-700";
    if (type.includes("Stealing")) return "bg-purple-50 border-purple-500 text-purple-700";
    if (type.includes("Loitering")) return "bg-blue-50 border-blue-500 text-blue-700";
    if (type.includes("Pacing")) return "bg-orange-50 border-orange-500 text-orange-700";
    if (type.includes("Scanning")) return "bg-pink-50 border-pink-500 text-pink-700";
    return "bg-gray-50 border-gray-500 text-gray-700";
  };

  

  return (
      <div className="max-w-1xl mx-auto p-6">
        {/* Header Section */}
        <div className="d-flex justify-content-start">
          <h1 className="text-5xl font-bold flex items-center gap-5 text-gray-800">
            <FaVideo className="text-violet-500" /> My Camera
          </h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Left Side: Live Camera Feed */}
          <div className="lg:col-span-2 border rounded-2xl shadow-lg bg-white overflow-hidden hover:shadow-xl transition-all">
            <div className="px-4 py-2 border-b flex justify-between items-center bg-gray-50">
              <span className="text-sm text-green-600 font-medium flex items-center gap-2">
                <span className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></span>
                Live Stream
              </span>
            </div>

            <div className="h-[450px] w-full bg-black flex justify-center items-center p-1">
              {/* Pointing to localhost Flask server */}
              <img
                src="http://localhost:5000/video"
                alt="Live Camera Feed"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
          </div>

          {/* Right Side - Calendar + Clock + Alerts */}
          <div className="flex flex-col gap-6">
           
            {/* Date & Time Card */}
            <div className="border rounded-2xl shadow-lg bg-white p-6 flex flex-col items-center">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Date & Time</h2>
              <div className="text-3xl font-bold text-violet-500 mb-4">
                {formattedTime}
              </div>
              <div className="border rounded-xl bg-gray-50 p-4 text-center w-full">
                <p className="text-gray-700 font-medium">{formattedDate}</p>
              </div>
            </div>

            {/* Recent Alerts Card */}
            <div className="border rounded-2xl shadow-lg bg-white p-4 flex flex-col h-[350px]">
              <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FaExclamationTriangle className="text-orange-500"/> Recent Alerts
              </h2>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {alerts.length === 0 ? (
                  <p className="text-gray-400 text-center py-10 italic">No anomalies detected yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {alerts.map((alert, index) => (
                      <li
                        key={index}
                        className={`p-3 border-l-4 rounded-r-md shadow-sm ${getAlertStyle(alert.type)}`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-sm uppercase">{alert.type}</span>
                          <span className="text-xs opacity-70">{alert.timestamp.split('_')[1].replace(/(\d{2})(\d{2})(\d{2})/, "$1:$2:$3")}</span>
                        </div>
                        <p className="text-xs mt-1 opacity-80 truncate">Camera: {alert.camera}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
  );
}
