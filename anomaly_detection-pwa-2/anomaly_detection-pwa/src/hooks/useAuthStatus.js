import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '../firebase/config'; 

const db = getFirestore(app);
const auth = getAuth(app);

const useAuthStatus = () => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null); 
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true; // para safe sa unmount
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!isMounted) return;

            if (currentUser) {
                setUser(currentUser);

                try {
                    const userDocRef = doc(db, "users", currentUser.uid);
                    const userDoc = await getDoc(userDocRef);
                    const fetchedRole = userDoc.exists() ? userDoc.data().role || 'user' : 'user';
                    
                    if (isMounted) {
                        setRole(fetchedRole);
                        setLoading(false);
                    }
                } catch (error) {
                    console.error("Error fetching role:", error);
                    if (isMounted) {
                        setRole('user');
                        setLoading(false);
                    }
                }
            } else {
                setUser(null);
                setRole('guest');
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);

    return { user, role, loading };
};

export default useAuthStatus;
