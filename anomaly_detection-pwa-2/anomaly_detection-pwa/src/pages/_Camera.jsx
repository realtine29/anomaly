import React, { useState } from "react";
import axios from "axios";
import { getAuth } from "firebase/auth";
import { FaVideo, FaPlus, FaLink, FaCamera } from "react-icons/fa6"; // Added icons
import { toast } from "react-toastify"; // Using toast for better feedback

const _Camera = () => {
  const [cameraName, setCameraName] = useState("");
  const [rtspUrl, setRtspUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddCamera = async (e) => {
    e.preventDefault();

    setLoading(true);

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      toast.error("You must be logged in to add a camera.");
      setLoading(false);
      return;
    }

    const isValidRtsp = (url) => url.startsWith("rtsp://");
    if (!isValidRtsp(rtspUrl)) {
      toast.error("Invalid RTSP URL format. It must start with 'rtsp://'.");
      setLoading(false);
      return;
    }

    try {
      await axios.post("http://localhost:5000/addCamera", {
        userId: user.uid,
        cameraName,
        rtspUrl,
      });

      toast.success(`Camera '${cameraName}' added successfully!`);
      setCameraName("");
      setRtspUrl("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add camera. Check server logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-xl mx-auto">

        {/* --- Header Section --- */}
        <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-violet-100 rounded-xl text-violet-600">
                <FaCamera className="text-3xl" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Camera Configuration</h1>
                <p className="text-gray-500 text-sm">Add new surveillance devices for anomaly detection.</p>
            </div>
        </div>

        {/* --- Form Card --- */}
        <div className="p-8 rounded-3xl shadow-2xl bg-white border border-gray-100">
          
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-700">
            <FaPlus className="text-violet-600 text-lg" /> Connect New Camera
          </h2>

          <form onSubmit={handleAddCamera} className="flex flex-col gap-5">
            
            {/* Camera Name Input */}
            <div>
              <label htmlFor="cameraName" className="block text-sm font-medium text-gray-700 mb-1">
                <FaVideo className="inline mr-1 text-xs text-gray-400" /> Camera Name
              </label>
              <input
                id="cameraName"
                type="text"
                placeholder="Living Room Camera"
                className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition duration-150"
                value={cameraName}
                onChange={(e) => setCameraName(e.target.value)}
                required
              />
            </div>

            {/* RTSP URL Input */}
            <div>
              <label htmlFor="rtspUrl" className="block text-sm font-medium text-gray-700 mb-1">
                <FaLink className="inline mr-1 text-xs text-gray-400" /> RTSP Stream URL
              </label>
              <input
                id="rtspUrl"
                type="text"
                placeholder="rtsp://user:password@ip_address:port/stream"
                className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition duration-150 font-mono text-sm"
                value={rtspUrl}
                onChange={(e) => setRtspUrl(e.target.value)}
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Ensure the URL starts with <code className="bg-gray-100 p-1 rounded font-mono">rtsp://</code> and includes authentication if required.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`mt-4 w-full py-3 rounded-xl font-bold transition duration-300 ease-in-out flex items-center justify-center gap-2
                ${loading ? "bg-violet-400 cursor-not-allowed" : "bg-violet-600 hover:bg-violet-700 text-white shadow-lg"}
              `}
              disabled={loading}
            >
              <FaPlus />
              {loading ? "Connecting Camera..." : "Add Camera"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default _Camera;