// src/context/UserContext.js
//
// No authentication. The current user is stored in localStorage.
// Admin can add users via the Admin panel; anyone can switch
// their identity from the sidebar "Switch user" button.

import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc, setDoc, collection, onSnapshot, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { ROLE_TEAM_MAP } from "../utils/constants";
import { v4 as uuidv4 } from "uuid";

const UserContext = createContext();

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser]     = useState(null);
  const [allUsers, setAllUsers]           = useState([]);
  const [loadingUsers, setLoadingUsers]   = useState(true);

  // Load all users from Firestore (live)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllUsers(list);
      setLoadingUsers(false);

      // Restore selected user from localStorage
      const savedId = localStorage.getItem("workhub_user_id");
      if (savedId) {
        const found = list.find((u) => u.id === savedId);
        if (found) setCurrentUser(found);
      }
    });
    return unsub;
  }, []);

  function selectUser(user) {
    setCurrentUser(user);
    localStorage.setItem("workhub_user_id", user.id);
  }

  function clearUser() {
    setCurrentUser(null);
    localStorage.removeItem("workhub_user_id");
  }

  async function addUser(data) {
    const id = uuidv4();
    await setDoc(doc(db, "users", id), {
      ...data,
      id,
      team: ROLE_TEAM_MAP[data.role],
      active: true,
      createdAt: new Date(),
    });
    return id;
  }

  async function updateUser(id, data) {
    await updateDoc(doc(db, "users", id), {
      ...data,
      team: data.role ? ROLE_TEAM_MAP[data.role] : undefined,
    });
    // If editing the current user, refresh
    if (currentUser?.id === id) {
      const snap = await getDoc(doc(db, "users", id));
      if (snap.exists()) setCurrentUser({ id: snap.id, ...snap.data() });
    }
  }

  async function removeUser(id) {
    await deleteDoc(doc(db, "users", id));
    if (currentUser?.id === id) clearUser();
  }

  const value = {
    currentUser,
    allUsers,
    loadingUsers,
    selectUser,
    clearUser,
    addUser,
    updateUser,
    removeUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
