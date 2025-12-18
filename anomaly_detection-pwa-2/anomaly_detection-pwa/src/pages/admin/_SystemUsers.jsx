import React, { useEffect, useState } from "react";
import { getAllUsers, createUserEntry, updateUserEntry, deleteUserEntry } from "../../firebase/config";
import { FaUserGroup, FaEnvelope, FaPen, FaTrash, FaPlus, FaXmark, FaKey } from "react-icons/fa6";
import { toast } from "react-toastify";

const SystemUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState("add"); 

  const [selectedUser, setSelectedUser] = useState(null);

    const [formData, setFormData] = useState({ 
        username: "", 
        email: "", 
        password: "", 
        uid: "", 
        role: "user" // <-- IDAGDAG ITO
    });
  

  const refreshUsers = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const handleOpenAdd = () => {
    setCurrentAction("add");
    // Reset form including password
    setFormData({ username: "", email: "", password: "", uid: "" }); 
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setCurrentAction("edit");
    setSelectedUser(user);
    setFormData({ 
        username: user.username, 
        email: user.email, 
        password: "", // <-- MAHALAGA: Clear password on edit
        uid: user.uid,
        role: user.role || 'user' // <-- IDAGDAG: Kunin ang kasalukuyang role
    });
    setIsModalOpen(true);
};

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this user? They will still exist in Auth unless deleted there.")) {
        const success = await deleteUserEntry(id);
        if (success) refreshUsers();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let success = false;

    if (currentAction === "add") {
        // Validate Password
        if (formData.password.length < 6) {
            toast.warning("Password must be at least 6 characters");
            return;
        }
        // Pass userData AND password
        success = await createUserEntry(formData, formData.password);
    } else {
        // Update doesn't change password here
        success = await updateUserEntry(selectedUser.id, {
                username: formData.username,
                email: formData.email,
                role: formData.role // <-- IPASA ANG ROLE SA UPDATE
        });
    }

    if (success) {
        setIsModalOpen(false);
        refreshUsers();
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen relative">
      
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-8">
            <div className="flex items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-1">System Users</h1>
                    <p className="text-gray-500 text-sm">Manage system preferences and authorized users.</p>
                </div>
            </div>
            <button 
                onClick={handleOpenAdd}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"
            >
                <FaPlus /> Add User
            </button>
        </div>

        {/* Users List Container */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden flex flex-col h-[600px]"> 
          <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-white z-10">
            <div className="p-3 bg-violet-100 rounded-xl text-violet-500">
                <FaUserGroup className="text-xl" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-800">System Users</h2>
                <p className="text-sm text-gray-500">Total Users: {users.length}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-violet-200 scrollbar-track-transparent">
            {loading ? (
                <div className="p-8 flex justify-center text-gray-400">Loading users...</div>
            ) : users.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No users found.</div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-500 font-medium text-sm sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-4 pl-6">User</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Role / UID</th>
                            <th className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-violet-50 transition-colors group">
                                <td className="p-4 pl-6 flex items-center gap-3">
                                    <img 
                                        src={user.photoURL || `https://api.dicebear.com/9.x/initials/svg?seed=${user.username || "User"}`} 
                                        alt="avatar" 
                                        className="w-10 h-10 rounded-full bg-gray-200 object-cover"
                                    />
                                    <span className="font-semibold text-gray-700">
                                        {user.username || user.displayName || "Unknown"}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <FaEnvelope className="text-gray-300" />
                                        {user.email}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full 
                                        ${user.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {/* I-display ang Role */}
                                        {user.role || 'user'}
                                    </span>
                                    {/* I-display ang UID sa ibaba */}
                                    <p className="text-xs text-gray-400 font-mono mt-1">
                                        {user.uid ? user.uid.substring(0, 8) + '...' : "N/A"} 
                                    </p>
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => handleOpenEdit(user)}
                                            className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100" title="Edit">
                                            <FaPen />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(user.id)}
                                            className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100" title="Delete">
                                            <FaTrash />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
          </div>
        </div>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">
                        {currentAction === "add" ? "Add New User" : "Edit User"}
                    </h2>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                        <FaXmark className="text-xl text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="text-sm font-bold text-gray-500">Username</label>
                        <input 
                            required
                            type="text" 
                            className="w-full border p-2 rounded-xl mt-1 focus:ring-2 focus:ring-violet-500 outline-none"
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-500">Email</label>
                        <input 
                            required
                            type="email" 
                            className="w-full border p-2 rounded-xl mt-1 focus:ring-2 focus:ring-violet-500 outline-none"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-500">User Role</label>
                        <select
                            required
                            className="w-full border p-2 rounded-xl mt-1 focus:ring-2 focus:ring-violet-500 outline-none"
                            value={formData.role}
                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    
                    {currentAction === "add" && (
                        <div>
                            <label className="text-sm font-bold text-gray-500 flex items-center gap-1">
                                <FaKey className="text-xs" /> Password
                            </label>
                            <input 
                                required
                                type="text" 
                                placeholder="Create a password for this user"
                                className="w-full border p-2 rounded-xl mt-1 focus:ring-2 focus:ring-violet-500 outline-none"
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                            />
                            <p className="text-xs text-gray-400 mt-1">Must be at least 6 characters.</p>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="mt-4 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-bold transition-colors"
                    >
                        {currentAction === "add" ? "Create User" : "Save Changes"}
                    </button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};

export default SystemUsers;