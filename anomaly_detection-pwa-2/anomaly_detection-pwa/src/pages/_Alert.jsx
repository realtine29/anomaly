import React, { useEffect, useState, useRef } from "react";
//import MainLayout from "../layouts/MainLayout";
import { useLocation } from 'react-router-dom';
import { Bell, AlertTriangle, CheckCircle, Loader2, Trash2 } from "lucide-react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
} from "firebase/firestore";

const _Alert = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const db = getFirestore();

  // 1. Navigation & Scrolling Refs
  const location = useLocation();
  const alertIdToFocus = location.state?.alertIdToFocus; // The ID passed from Dashboard
  const alertRefs = useRef({}); // Store references to alert elements
  const scrollExecuted = useRef(false); // Ensure we only scroll once

  // 2. Fetch Alerts from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const alertsRef = collection(db, "users", user.uid, "alerts");
    const q = query(alertsRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate().toLocaleString(),
        }));
        setAlerts(data);
        setLoading(false);
      },
      (error) => {
        console.error(" Failed to fetch alerts:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth, db]);

  // 3. Scroll to the specific alert when data is loaded
  useEffect(() => {
    if (alertIdToFocus && alerts.length > 0 && !loading && !scrollExecuted.current) {
        // Try to find the alert by ID
        // Note: Make sure the ID passed from Dashboard matches 'alert.id' or 'alert.file'
        // If Dashboard passes a file path, we might need to check: alert.file === alertIdToFocus
        const targetElement = alertRefs.current[alertIdToFocus] || 
                              alertRefs.current[alerts.find(a => a.file === alertIdToFocus)?.id];

        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            scrollExecuted.current = true;
        }
    }
  }, [alerts, loading, alertIdToFocus]);

  const handleDelete = async (alertId) => {
    const user = auth.currentUser;
    if (!user) return alert("User not authenticated.");
    const confirmDelete = window.confirm("Are you sure you want to delete this alert?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "alerts", alertId));
      console.log("Alert deleted:", alertId);
    } catch (error) {
      console.error("Error deleting alert:", error);
      alert("Failed to delete alert. Try again.");
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "Fighting":
        return <AlertTriangle className="text-red-500" size={22} />;
      case "Stealing":
        return <Bell className="text-yellow-500" size={22} />;
      default:
        return <CheckCircle className="text-blue-500" size={22} />;
    }
  };

  return (
      <div className="p-6">
        <div className="bg-white rounded-2xl shadow-sm p-4 h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center mt-20 text-gray-400">
              <Loader2 className="animate-spin mb-3" size={30} />
              <p>Loading alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <p className="text-center text-gray-400 mt-10">No alerts yet</p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                // Attach Ref
                ref={(el) => (alertRefs.current[alert.id] = el)}
                // Dynamic Class for Highlighting
                className={`flex items-center justify-between border-b py-4 px-2 transition-all ${
                    (alert.id === alertIdToFocus || alert.file === alertIdToFocus)
                    ? "bg-yellow-50 border-l-4 border-yellow-400" 
                    : "hover:bg-gray-50"
                }`}
              >
                {/* Left Info */}
                <div className="flex items-start gap-3 w-[30%]">
                  {getIcon(alert.action)}
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-800">{alert.action}</span>
                    <span className="text-sm text-gray-500">{alert.timestamp}</span>
                    <p className="text-sm text-gray-600 mt-1 leading-snug">
                      {alert.description || "Anomaly detected by AI model."}
                    </p>
                  </div>
                </div>

                {/* Centered Video */}
                {alert.clipUrl && (
                  <div className="w-[40%] flex justify-center">
                    <video
                      src={alert.clipUrl}
                      controls
                      className="rounded-lg h-40 w-full max-w-[300px] object-cover border border-gray-200 shadow-sm"
                    />
                  </div>
                )}

                {/* Right Delete Button */}
                <div className="w-[10%] flex justify-end pr-3">
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="text-gray-400 hover:text-red-500 transition"
                    title="Delete alert"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
  );
};

export default _Alert;