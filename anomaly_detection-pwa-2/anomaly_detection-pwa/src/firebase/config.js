import { initializeApp, deleteApp } from "firebase/app"; 
import { 
  getFirestore, 
  doc, 
  getDoc, // Added getDoc here
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  updateDoc  
} from "firebase/firestore";
import { toast } from "react-toastify";
import { getAuth } from "firebase/auth";

// Firebase config (UPDATED to new account)
const firebaseConfig = {
  apiKey: "AIzaSyBkzsnfMCkjb57ZGOtAxtwYlQO6DIcitys",
  authDomain: "anomalydetection-18e91.firebaseapp.com",
  projectId: "anomalydetection-18e91",
  storageBucket: "anomalydetection-18e91.firebasestorage.app",
  messagingSenderId: "659795367154",
  appId: "1:659795367154:web:d76596f4acb6ee49f82c6b"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// ---------------- AUTH FUNCTIONS ----------------

// Register
const register = async (username, email, password) => {
  try {
    const { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } = await import("firebase/auth");
    const auth = getAuth(app);

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update displayName and photoURL
    await updateProfile(user, {
      displayName: username, 
      photoURL: `https://api.dicebear.com/9.x/initials/svg?seed=${username}`
    });

    await setDoc(doc(db, "users", userCredential.user.uid), {
      uid: userCredential.user.uid,
      username,
      email,
      createdAt: new Date(),
    });

    // CRITICAL FIX: Logout IMMEDIATELY so App.js doesn't redirect to Dashboard
    await signOut(auth);

    console.log("User signed up:", userCredential.user.uid);
    toast.success("User registered successfully! Please Login.");
    
    return userCredential.user; 
  } catch (error) {
    console.error("Register error:", error.message);
    toast.error(error.code.split("/")[1].split("-").join(" "));
  }
};

// Login 
const login = async (email, password) => {
  try {
    const { getAuth, signInWithEmailAndPassword } = await import("firebase/auth");
    const auth = getAuth(app);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const userDocRef = doc(db, "users", user.uid);
    let userRole = 'user'; // Default role is 'user'

    // 1. Fetch the user's document
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // 2. Check the 'role' field
        if (userData.role) {
            userRole = userData.role;
        }

    } else {
        // 3. (Optional) Re-create user document if missing (your existing FIX code)
        await setDoc(userDocRef, {
            uid: user.uid,
            username: user.displayName || "User",
            email: user.email,
            createdAt: new Date(), 
            photoURL: user.photoURL || `https://api.dicebear.com/9.x/initials/svg?seed=${user.email}`
        });
        console.log("Restored missing user document for:", user.email);
    }
    
    console.log(`User logged in with role: ${userRole}`);
    toast.success("Welcome back!");

    // 4. Return the user object AND their role
    return { user, role: userRole }; 
    
  } catch (error) {
    console.error("Login error:", error.message);
    toast.error(error.code.split('/')[1].split('-').join(" "));
    return null; // Return null on failure
  }
};

// Sign in with Google
const signInWithGoogle = async () => {
  try {
    const { getAuth, GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // FIX: Add 'createdAt' so these users don't get hidden by filters later
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      username: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      createdAt: new Date() // Added timestamp
    }, { merge: true });

    toast.success("Logged in with Google!");
    return user;

  } catch (error) {
    console.error("Google Login error:", error.message);
    toast.error("Google Login failed");
  }
};

// Logout
const logout = async () => {
  try {
    const { getAuth, signOut } = await import("firebase/auth");
    const auth = getAuth(app);

    await signOut(auth);
    toast.success("You have been logged out");
  } catch (error) {
    console.error("Logout error:", error.message);
    toast.error("Failed to logout");
  }
};

// Forgot password (Email Reset Link)
const forgotPassword = async (email) => {
  try {
    const { getAuth, sendPasswordResetEmail } = await import("firebase/auth");
    const auth = getAuth(app);

    await sendPasswordResetEmail(auth, email);
    toast.success("Password reset link sent to your email.");
  } catch (error) {
    console.error("Forgot password error:", error.message);
    toast.error(error.code.split('/')[1].split('-').join(" "));
  }
};

// Change Password with Re-authentication
const updateUserPassword = async (currentPassword, newPassword) => {
  try {
    const { 
        getAuth, 
        updatePassword, 
        EmailAuthProvider, 
        reauthenticateWithCredential 
    } = await import("firebase/auth");
    
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (user) {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      toast.success("Password updated successfully!");
      return true;
    }
  } catch (error) {
    console.error("Update password error:", error.message);
    
    if (error.code === 'auth/wrong-password') {
        toast.error("Current password is incorrect.");
    } else if (error.code === 'auth/weak-password') {
        toast.error("New password must be at least 6 characters.");
    } else if (error.code === 'auth/requires-recent-login') {
        toast.error("For security, please log in again.");
    } else {
        toast.error(error.message);
    }
    return false;
  }
};

// Delete Account
const deleteAccount = async () => {
  try {
    const { getAuth, deleteUser } = await import("firebase/auth");
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (user) {
      await deleteUser(user);
      toast.success("Account deleted successfully.");
      return true; 
    }
  } catch (error) {
    console.error("Delete account error:", error.message);
    
    if (error.code === 'auth/requires-recent-login') {
        toast.error("Security Check: Please Log Out and Log In again to delete your account.");
    } else {
        toast.error(error.message);
    }
    return false;
  }
};

// --- FIXED: Fetch All Users (Safe sorting) ---
const getAllUsers = async () => {
  try {
    const usersRef = collection(db, "users");
    
    // FIX: We fetch ALL documents without 'orderBy' first.
    // This ensures users missing 'createdAt' (like old Google logins) are NOT hidden.
    const querySnapshot = await getDocs(usersRef);
    
    const usersList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Perform sorting in JavaScript (safely handles missing dates)
    usersList.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA; // Descending order (newest first)
    });

    return usersList;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

// --- REQUIRED: CRUD FUNCTIONS FOR SYSTEM USERS PAGE ---
// (These are needed for your SystemUser.jsx file to work)

// 1. Manually Create User
const createUserEntry = async (userData, password) => {
  const secondaryApp = initializeApp(firebaseConfig, "Secondary");
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const { createUserWithEmailAndPassword, updateProfile, signOut } = await import("firebase/auth");

    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, password);
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: userData.username,
      photoURL: `https://api.dicebear.com/9.x/initials/svg?seed=${userData.username}`
    });

    await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: userData.username,
        email: userData.email,
        createdAt: new Date(),
        photoURL: user.photoURL
    });

    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);

    toast.success(`User "${userData.username}" created successfully!`);
    return true;

  } catch (error) {
    console.error("Error creating user:", error);
    await deleteApp(secondaryApp); 
    
    if(error.code === 'auth/email-already-in-use') {
        toast.error("That email is already registered.");
    } else {
        toast.error("Failed to create user account.");
    }
    return false;
  }
};

// 2. Update User Entry
const updateUserEntry = async (userId, newData) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, newData);
    toast.success("User updated successfully");
    return true;
  } catch (error) {
    console.error("Error updating user:", error);
    toast.error("Failed to update user");
    return false;
  }
};

// 3. Delete User Entry
const deleteUserEntry = async (userId) => {
  try {
    await deleteDoc(doc(db, "users", userId));
    toast.success("User removed from list");
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    toast.error("Failed to delete user");
    return false;
  }
};

const getToken = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in");
  return await user.getIdToken(); 
};

// EXPORT ALL FUNCTIONS
export { 
  app, 
  db, 
  login, 
  register, 
  logout, 
  forgotPassword, 
  getToken, 
  signInWithGoogle, 
  deleteAccount, 
  updateUserPassword, 
  getAllUsers,
  createUserEntry,
  updateUserEntry, 
  deleteUserEntry  
};